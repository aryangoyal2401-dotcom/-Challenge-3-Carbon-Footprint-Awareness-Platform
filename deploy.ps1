# deploy.ps1
# Automates staging, committing, and pushing all project files to GitHub and Glitch.

Write-Host "🚀 Starting deployment automation..." -ForegroundColor Cyan

# 1. Check if Glitch remote is configured
$remotes = git remote
$hasGlitch = $remotes -contains "glitch"

if (-not $hasGlitch) {
    Write-Host "ℹ️ Glitch remote is not configured yet." -ForegroundColor Yellow
    Write-Host "Please follow these steps to get your Glitch Git URL:" -ForegroundColor White
    Write-Host "  1. Open your Glitch project editor (glitch.com)" -ForegroundColor White
    Write-Host "  2. In the bottom left, click on: Tools > Git Import and Export" -ForegroundColor White
    Write-Host "  3. Copy the Git URL (it looks like https://[token]@git.glitch.com/...)" -ForegroundColor White
    Write-Host ""
    
    $glitchUrl = Read-Host "📋 Paste your Glitch Git URL here"
    $glitchUrl = $glitchUrl.Trim()
    
    if (-not [string]::IsNullOrEmpty($glitchUrl)) {
        Write-Host "⚙️ Adding Glitch remote..." -ForegroundColor Yellow
        git remote add glitch $glitchUrl
        Write-Host "✅ Glitch remote configured successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ No URL provided. Pushing only to GitHub." -ForegroundColor Red
    }
}

# 2. Check git status
$status = git status --porcelain
if ([string]::IsNullOrEmpty($status)) {
    # Check if we still need to push unsynced commits
    Write-Host "✨ Git working tree is clean. Proceeding to push any unsynced commits..." -ForegroundColor Green
} else {
    # Stage all changes
    Write-Host "➕ Staging files..." -ForegroundColor Yellow
    git add .

    # Create an automatic commit message with timestamp
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $commitMsg = "EcoTrack update: $timestamp"

    Write-Host "💾 Committing changes..." -ForegroundColor Yellow
    git commit -m "$commitMsg"
}

# 3. Push to GitHub (origin main)
Write-Host "📤 Pushing to GitHub (origin)..." -ForegroundColor Yellow
git push origin main

# 4. Push to Glitch (glitch main)
$remotes = git remote
if ($remotes -contains "glitch") {
    Write-Host "📤 Pushing to Glitch (this will update your live website)..." -ForegroundColor Yellow
    # Glitch projects use 'master' as the default branch or we can push main:master
    # Pushing local 'main' branch to remote 'master' branch on Glitch
    git push glitch main:master --force
    Write-Host "✅ Successfully pushed to Glitch!" -ForegroundColor Green
}

Write-Host "🏁 Deployment automation complete!" -ForegroundColor Green
