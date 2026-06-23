param(
  [string]$GitHubUser = "zudazhuang",
  [string]$Repo = "cbd-expert-review",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Url = "https://$GitHubUser.github.io/$Repo/"
Set-Content -LiteralPath (Join-Path $Root "site-url.txt") -Value $Url -Encoding UTF8

python (Join-Path $Root "scripts\make_qr.py") --url $Url
python (Join-Path $Root "scripts\make_qr_poster.py")

Push-Location $Root
try {
  $auth = gh auth status 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host $auth
    throw "GitHub CLI is not logged in. Run: gh auth login"
  }

  if (-not (Test-Path ".git")) {
    git init
    git checkout -B $Branch
  } else {
    git checkout -B $Branch
  }

  git add .
  $commitOutput = git commit -m "Add CBD expert review form" 2>&1
  if ($LASTEXITCODE -ne 0 -and ($commitOutput -join "`n") -notmatch "nothing to commit") {
    throw ($commitOutput -join "`n")
  }

  $repoExists = $true
  gh repo view "$GitHubUser/$Repo" *> $null
  if ($LASTEXITCODE -ne 0) {
    $repoExists = $false
  }

  if (-not $repoExists) {
    gh repo create "$GitHubUser/$Repo" --public --source "." --remote origin --push
  } else {
    $remote = git remote get-url origin 2>$null
    if (-not $remote) {
      git remote add origin "https://github.com/$GitHubUser/$Repo.git"
    }
    git push -u origin $Branch
  }

  $pagesBody = @{
    source = @{
      branch = $Branch
      path = "/"
    }
  } | ConvertTo-Json -Depth 5
  $tmpBody = Join-Path $env:TEMP "cbd-pages-body.json"
  Set-Content -LiteralPath $tmpBody -Value $pagesBody -Encoding UTF8

  gh api -X POST "repos/$GitHubUser/$Repo/pages" --input $tmpBody *> $null
  if ($LASTEXITCODE -ne 0) {
    gh api -X PUT "repos/$GitHubUser/$Repo/pages" --input $tmpBody | Out-Null
  }

  Write-Host "Published URL: $Url"
  Write-Host "QR code: $(Join-Path $Root 'assets\review_form_qr.png')"
  Write-Host "QR poster: $(Join-Path $Root 'assets\review_form_qr_poster.png')"
  Write-Host "If the URL still shows 404, wait 1-3 minutes for GitHub Pages to build."
}
finally {
  Pop-Location
}
