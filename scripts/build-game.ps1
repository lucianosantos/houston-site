[CmdletBinding()]
param(
    [string]$ProjectPath = $env:UNITY_PROJECT_PATH,
    [string]$EditorPath = $env:UNITY_EDITOR_PATH,
    [switch]$Copy,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$siteRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ([string]::IsNullOrWhiteSpace($ProjectPath)) {
    $ProjectPath = Join-Path $siteRoot '..\..\roguelike\GameJam2026'
}
$projectRoot = (Resolve-Path -LiteralPath $ProjectPath).Path
$versionPath = Join-Path $projectRoot 'ProjectSettings\ProjectVersion.txt'
if (-not (Test-Path -LiteralPath $versionPath -PathType Leaf)) {
    throw "Not a Unity project: $projectRoot"
}
$version = [regex]::Match((Get-Content -LiteralPath $versionPath -Raw), '(?m)^m_EditorVersion: (\S+)').Groups[1].Value
if (-not $version) { throw 'Cannot determine the Unity version from ProjectVersion.txt.' }
if ([string]::IsNullOrWhiteSpace($EditorPath)) {
    $EditorPath = Join-Path $env:ProgramFiles "Unity\Hub\Editor\$version\Editor\Unity.exe"
}
$unityExe = (Resolve-Path -LiteralPath $EditorPath).Path
if (-not (Test-Path -LiteralPath $unityExe -PathType Leaf)) { throw "Unity executable not found: $unityExe" }
$modulesRoot = Join-Path (Split-Path $unityExe) 'Data\PlaybackEngines'
$outputRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot 'output'))
$gameRoot = [IO.Path]::GetFullPath((Join-Path $siteRoot 'public\game'))
$logRoot = Join-Path $siteRoot '.game-publish\build-logs'

function Assert-ChildPath([string]$Path, [string]$Parent, [string]$Expected) {
    $full = [IO.Path]::GetFullPath($Path)
    $expectedPath = [IO.Path]::GetFullPath((Join-Path $Parent $Expected))
    if ($full -ne $expectedPath -or -not $full.StartsWith($Parent.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to modify an unexpected path: $full"
    }
    # Refuse junctions/symlinks in the target or any ancestor before recursive operations.
    $cursor = $full
    while ($cursor) {
        if (Test-Path -LiteralPath $cursor) {
            if ((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "Refusing to modify a symbolic link or junction: $cursor"
            }
        }
        $cursor = Split-Path $cursor -Parent
    }
    if (Test-Path -LiteralPath $full) {
        $links = @(Get-ChildItem -LiteralPath $full -Recurse -Force | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint })
        if ($links.Count) { throw "Refusing recursive operations on a tree containing symbolic links: $full" }
    }
}

# A running Editor may have unsaved changes and prevents command-line access to the project.
$lockPath = Join-Path $projectRoot 'Temp\UnityLockfile'
if (Test-Path -LiteralPath $lockPath) {
    try {
        $lock = [IO.File]::Open($lockPath, [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
        $lock.Dispose()
    } catch {
        $cause = $_.Exception
        while ($cause.InnerException) { $cause = $cause.InnerException }
        if (($cause.HResult -band 0xffff) -in @(32, 33)) {
            throw "Close Unity for this project before building. The project lock is in use: $lockPath"
        }
        throw "Cannot check the Unity project lock: $($cause.Message)"
    }
}

$builds = @(
    @{ Name = 'Windows'; Folder = 'windows'; Target = 19; Module = 'windowsstandalonesupport'; Output = 'Windows\Houston.exe'; Required = @('Windows\Houston.exe', 'Windows\UnityPlayer.dll', 'Windows\Houston_Data') },
    @{ Name = 'Mobile'; Folder = 'mobile'; Target = 13; Module = 'AndroidPlayer'; Output = 'Mobile\Houston.apk'; Required = @('Mobile\Houston.apk') },
    @{ Name = 'Web'; Folder = 'web'; Target = 20; Module = 'WebGLSupport'; Output = 'Web'; Required = @('Web\index.html', 'Web\Build') }
)

# Finish preflight before removing the previous output.
foreach ($build in $builds) {
    $build.Profile = "Assets/Settings/Build Profiles/$($build.Name).asset"
    $profilePath = Join-Path $projectRoot $build.Profile
    if (-not (Test-Path -LiteralPath $profilePath -PathType Leaf)) { throw "Missing Build Profile: $profilePath" }
    $profile = Get-Content -LiteralPath $profilePath -Raw
    if ($profile -notmatch "(?m)^  m_BuildTarget: $($build.Target)\s*$") { throw "Wrong platform in Build Profile: $profilePath" }
    if ($build.Name -eq 'Mobile' -and $profile -notmatch '(?m)^        m_BuildAppBundle: 0\s*$') {
        throw 'The Mobile Build Profile must generate an APK (Build App Bundle disabled).'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $modulesRoot $build.Module) -PathType Container)) {
        throw "Install the $($build.Name) build module in Unity Hub for $version."
    }
}
Assert-ChildPath $outputRoot $projectRoot 'output'
if ($Copy) { Assert-ChildPath $gameRoot $siteRoot 'public\game' }
Write-Host "Unity: $unityExe"
Write-Host "Project: $projectRoot"
Write-Host "Clean build output: $outputRoot"
foreach ($build in $builds) { Write-Host "$($build.Name): $($build.Profile) -> $(Join-Path $outputRoot $build.Output)" }
if ($Copy) { Write-Host "Replace site game exports after ALL builds succeed: $gameRoot" }
if ($DryRun) { Write-Host 'VALIDATION ONLY: nothing removed, compiled or copied.'; return }

Remove-Item -LiteralPath $outputRoot -Recurse -Force -ErrorAction SilentlyContinue
if (Test-Path -LiteralPath $outputRoot) { throw "Could not remove the previous output: $outputRoot" }
New-Item -ItemType Directory -Force $outputRoot, $logRoot | Out-Null
foreach ($build in $builds) {
    New-Item -ItemType Directory -Force (Join-Path $outputRoot $build.Name) | Out-Null
    $logPath = Join-Path $logRoot ($build.Name.ToLowerInvariant() + '.log')
    $unityArgs = @('-batchmode', '-quit', '-projectPath', $projectRoot, '-activeBuildProfile', $build.Profile, '-build', (Join-Path $outputRoot $build.Output), '-logFile', $logPath)
    # Start-Process joins ArgumentList: quote each argument so paths containing spaces survive.
    $nativeArgs = @($unityArgs | ForEach-Object {
        if ($_.Contains('"')) { throw 'Unity arguments cannot contain double quotes.' }
        '"' + $_ + '"'
    })
    Write-Host "Building $($build.Name)... Log: $logPath"
    $process = Start-Process -FilePath $unityExe -ArgumentList $nativeArgs -PassThru -Wait -WindowStyle Hidden
    if ($process.ExitCode -ne 0) { throw "$($build.Name) build failed (exit $($process.ExitCode)). See $logPath. No files copied to the site." }
    foreach ($required in $build.Required) {
        if (-not (Test-Path -LiteralPath (Join-Path $outputRoot $required))) { throw "$($build.Name) build did not produce $required. See $logPath. No files copied to the site." }
    }
    Write-Host "$($build.Name) build succeeded."
}

if ($Copy) {
    # Prepare all copies first, then replace the site's input tree without leaving older files.
    $stagingName = '.game-publish\copy-' + [guid]::NewGuid().ToString('N')
    $stagingRoot = Join-Path $siteRoot $stagingName
    Assert-ChildPath $stagingRoot $siteRoot $stagingName
    New-Item -ItemType Directory -Force $stagingRoot | Out-Null
    foreach ($build in $builds) {
        $destination = Join-Path $stagingRoot $build.Folder
        New-Item -ItemType Directory -Force $destination | Out-Null
        Get-ChildItem -LiteralPath (Join-Path $outputRoot $build.Name) -Force | Copy-Item -Destination $destination -Recurse -Force
    }
    Assert-ChildPath $gameRoot $siteRoot 'public\game'
    if (Test-Path -LiteralPath $gameRoot) { Remove-Item -LiteralPath $gameRoot -Recurse -Force }
    New-Item -ItemType Directory -Force (Split-Path $gameRoot) | Out-Null
    Move-Item -LiteralPath $stagingRoot -Destination $gameRoot
    Write-Host "Copied Windows, mobile and Web builds to $gameRoot."
}
Write-Host 'All three builds succeeded. Nothing published to R2.'
