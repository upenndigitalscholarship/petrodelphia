# Software Dependencies for Petrosylvania Collection Builder

## Required for Local Development

### Ruby & Jekyll
- **Ruby** (version 2.7+, ideally 3.0+)
  - Download from: https://rubyinstaller.org/
  - Choose the version WITH DevKit
  
- **Bundler** (Ruby gem dependency manager)
  - Installed automatically with Ruby, or run: `gem install bundler`

### Purpose
- Ruby and Bundler are needed to build and serve this Jekyll static site locally
- Command: `bundle install` then `bundle exec jekyll serve --livereload`
- Serves site at `http://localhost:4000`

## Optional (for future enhancements)
- **Node.js** (v16+; lightweight local HTTP server, can replace Jekyll dev server)
  - Download from: https://nodejs.org/ (LTS version recommended)
  - Useful for: Simple local HTTP server, npm package management
  - Command: `npx http-server -p 8000` to serve on port 8000
  
- **IIS (Internet Information Services)** (Windows built-in web server)
  - Enable via: Control Panel > Programs > Turn Windows features on or off
  - Check "Internet Information Services"
  - More complex to configure but powerful for production-like testing
  
- **Git** (if not already installed; used for version control)

## Installation Steps for IT
1. Install Ruby (with DevKit) from rubyinstaller.org
2. Add Ruby to system PATH (typically automatic)
3. Verify: Open PowerShell and run `ruby --version` and `bundle --version`
4. No additional setup needed—site will work once Ruby is installed

## Notes
- This is a Jekyll static site generator project
- All necessary Ruby gems are listed in `Gemfile` and `Gemfile.lock`
- After Ruby installation, simply run `bundle install` in the project root, then `bundle exec jekyll serve`
