# GitHub Setup Instructions

Your Chrome Vertical Tab Bar project is ready to be pushed to GitHub!

## Step 1: Create GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the "+" icon in the top right → "New repository"
3. Repository name: `chrome-vertical-tab-bar` (or your preferred name)
4. Description: `A moveable vertical tab bar for Windows built with Electron`
5. Set to **Public** (or Private if you prefer)
6. **DO NOT** check "Add a README file" (we already have one)
7. **DO NOT** check "Add .gitignore" (we already have one)
8. Click "Create repository"

## Step 2: Connect and Push

After creating the repository, GitHub will show you commands. Use these in your terminal:

```bash
cd "C:\Users\aniss\Desktop\Website Files\Chrome-Vertical Tab-Bar"

# Add the GitHub repository as remote origin
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name.**

## Step 3: Verify

1. Refresh your GitHub repository page
2. You should see all your files including the README.md
3. The README will be displayed on the main page with installation instructions

## Example Commands

If your GitHub username is `john` and you named the repo `chrome-vertical-tab-bar`:

```bash
git remote add origin https://github.com/john/chrome-vertical-tab-bar.git
git branch -M main
git push -u origin main
```

## Future Updates

To push future changes:

```bash
git add .
git commit -m "Description of changes"
git push
```

Your repository is ready to go! 🚀