$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$sourceScript = Join-Path $PSScriptRoot '..\scripts\build-game.ps1'
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('houston-build-test-' + [guid]::NewGuid().ToString('N'))
$site = Join-Path $testRoot 'site'
$project = Join-Path $testRoot 'Unity Project With Spaces'
$editor = Join-Path $testRoot 'Editor With Spaces\Unity.exe'
$global:houstonBuildInvocations = @()
$global:houstonBuildFailPlatform = ''

function Assert($Condition, [string]$Message) { if (-not $Condition) { throw $Message } }
function Write-Fixture([string]$Path, [string]$Text = 'fixture') {
    New-Item -ItemType Directory -Force (Split-Path $Path) | Out-Null
    [IO.File]::WriteAllText($Path, $Text)
}
function Start-Process {
    param($FilePath, [string[]]$ArgumentList, [switch]$PassThru, [switch]$Wait, $WindowStyle)
    Assert ($Wait -and $PassThru -and $WindowStyle -eq 'Hidden') 'Unity must run sequentially with hidden windows.'
    $tokens = @($ArgumentList | ForEach-Object { $_.Trim('"') })
    $profile = $tokens[[Array]::IndexOf($tokens, '-activeBuildProfile') + 1]
    $platform = [IO.Path]::GetFileNameWithoutExtension($profile)
    $global:houstonBuildInvocations += $platform
    if ($platform -eq $global:houstonBuildFailPlatform) { return [pscustomobject]@{ ExitCode = 1 } }
    $output = $tokens[[Array]::IndexOf($tokens, '-build') + 1]
    if ($platform -eq 'Windows') {
        Write-Fixture $output
        Write-Fixture (Join-Path (Split-Path $output) 'UnityPlayer.dll')
        Write-Fixture (Join-Path (Split-Path $output) 'Houston_Data\assets')
    } elseif ($platform -eq 'Mobile') { Write-Fixture $output }
    else {
        Write-Fixture (Join-Path $output 'index.html')
        Write-Fixture (Join-Path $output 'Build\Web.loader.js')
    }
    return [pscustomobject]@{ ExitCode = 0 }
}

try {
    Write-Fixture (Join-Path $site 'scripts\build-game.ps1') (Get-Content -LiteralPath $sourceScript -Raw)
    Write-Fixture (Join-Path $project 'ProjectSettings\ProjectVersion.txt') 'm_EditorVersion: 6000.3.10f1'
    Write-Fixture $editor
    foreach ($entry in @(@('Windows', 19, 'windowsstandalonesupport'), @('Mobile', 13, 'AndroidPlayer'), @('Web', 20, 'WebGLSupport'))) {
        Write-Fixture (Join-Path $project "Assets\Settings\Build Profiles\$($entry[0]).asset") ("  m_BuildTarget: $($entry[1])`n        m_BuildAppBundle: 0`n")
        New-Item -ItemType Directory -Force (Join-Path (Split-Path $editor) "Data\PlaybackEngines\$($entry[2])") | Out-Null
    }
    $command = Join-Path $site 'scripts\build-game.ps1'
    $oldOutput = Join-Path $project 'output\stale.txt'
    $oldSite = Join-Path $site 'public\game\old.apk'
    $outside = Join-Path $project 'keep.txt'
    Write-Fixture $oldOutput
    Write-Fixture $oldSite
    Write-Fixture $outside

    & $command -ProjectPath $project -EditorPath $editor -Copy -DryRun
    Assert ((Test-Path $oldOutput) -and (Test-Path $oldSite) -and $global:houstonBuildInvocations.Count -eq 0) 'Dry run must not delete or compile.'

    & $command -ProjectPath $project -EditorPath $editor -Copy
    Assert (($global:houstonBuildInvocations -join ',') -eq 'Windows,Mobile,Web') 'Must build all three profiles in sequence.'
    Assert (-not (Test-Path $oldOutput)) 'The old Unity output must be removed.'
    Assert (-not (Test-Path $oldSite)) 'Copy must replace the site inputs, removing stale files.'
    Assert (Test-Path $outside) 'Must not modify files outside output.'
    foreach ($path in @('windows\Houston.exe', 'windows\Houston_Data\assets', 'mobile\Houston.apk', 'web\index.html')) {
        Assert (Test-Path (Join-Path $site ('public\game\' + $path))) "Missing copied file: $path"
    }

    $global:houstonBuildInvocations = @()
    $global:houstonBuildFailPlatform = 'Mobile'
    $sentinel = Join-Path $site 'public\game\keep-on-failure.txt'
    Write-Fixture $sentinel
    $failed = $false
    try { & $command -ProjectPath $project -EditorPath $editor -Copy } catch { $failed = $true }
    Assert $failed 'A failed Unity build must fail the command.'
    Assert (($global:houstonBuildInvocations -join ',') -eq 'Windows,Mobile') 'Must stop at the failing platform.'
    Assert (Test-Path $sentinel) 'Failed builds must not replace site inputs.'

    $global:houstonBuildFailPlatform = ''
    $global:houstonBuildInvocations = @()
    Write-Fixture $oldOutput
    $mobileProfile = Join-Path $project 'Assets\Settings\Build Profiles\Mobile.asset'
    [IO.File]::WriteAllText($mobileProfile, 'wrong platform')
    $failed = $false
    try { & $command -ProjectPath $project -EditorPath $editor } catch { $failed = $true }
    Assert ($failed -and (Test-Path $oldOutput) -and $global:houstonBuildInvocations.Count -eq 0) 'Invalid preflight must preserve output.'

    [IO.File]::WriteAllText($mobileProfile, "  m_BuildTarget: 13`n        m_BuildAppBundle: 0`n")
    $lockPath = Join-Path $project 'Temp\UnityLockfile'
    Write-Fixture $lockPath
    $heldLock = [IO.File]::Open($lockPath, [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
    try {
        $failed = $false
        try { & $command -ProjectPath $project -EditorPath $editor } catch { $failed = $_.Exception.Message -like 'Close Unity*' }
        Assert ($failed -and (Test-Path $oldOutput)) 'An open Editor must prevent output deletion.'
    } finally { $heldLock.Dispose() }
    Write-Host 'PASS: clean output, sequential profiles, quoted paths, clean copy, failure isolation, preflight and Editor lock.'
} finally {
    $absolute = [IO.Path]::GetFullPath($testRoot)
    $tempParent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    if ($absolute.StartsWith($tempParent) -and (Split-Path $absolute -Leaf) -like 'houston-build-test-*') {
        Remove-Item -LiteralPath $absolute -Recurse -Force
    }
}
