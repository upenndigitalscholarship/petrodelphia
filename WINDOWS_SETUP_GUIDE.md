# Local Development Setup for CollectionBuilder Website

This guide helps you set up the Petrodelphia CollectionBuilder website for local development on Windows.

## Quick Start (Windows)

### 1. Install Ruby 3.3+

Download and install **RubyInstaller 3.3** from: https://rubyinstaller.org/

**During installation, IMPORTANT: Check these options:**
- ✓ "Add Ruby executables to your PATH"
- ✓ "Associate .rb and .rbw files with this Ruby installation"  
- ✓ "Install MSYS2 development toolchain" (at the end)

### 2. Run Setup Script

Double-click: `setup-windows.bat` in your project root.

This script will:
- Verify Ruby installation
- Install Bundler
- Enable MSYS2 development tools
- Install all gem dependencies
- Verify Jekyll is working

### 3. Start Development Server

Open Command Prompt (cmd) and run:

```cmd
cd "C:\Users\[YourUsername]\VS Code repos\petrosylvania-collection-builder"
C:\Ruby33-x64\bin\ridk enable
bundle exec jekyll s
```

Or use PowerShell:

```powershell
cd "C:\Users\[YourUsername]\VS Code repos\petrosylvania-collection-builder"
cmd /c "C:\Ruby33-x64\bin\ridk enable && bundle exec jekyll s"
```

The site will be available at: **http://127.0.0.1:4000**

---

## Manual Installation (If Script Doesn't Work)

### Step 1: Install Ruby

1. Download RubyInstaller 3.3 from https://rubyinstaller.org/downloads/
2. Run the installer
3. **IMPORTANT**: During setup:
   - Check "Add Ruby executables to your PATH"
   - When asked about MSYS2, select "MSYS2 and MINGW development toolchain installation"

### Step 2: Install Build Tools

Open Command Prompt as Administrator and run:

```cmd
C:\Ruby33-x64\bin\ridk install 1 2 3
```

Select default options (press Enter when prompted).

### Step 3: Install Bundler

```cmd
gem install bundler
```

### Step 4: Install Project Dependencies

Navigate to your project directory:

```cmd
cd "C:\Users\[YourUsername]\VS Code repos\petrosylvania-collection-builder"
```

Then run:

```cmd
C:\Ruby33-x64\bin\ridk enable
bundle install
```

This may take 5-10 minutes as it compiles native gems.

### Step 5: Start Development Server

```cmd
C:\Ruby33-x64\bin\ridk enable
bundle exec jekyll s
```

---

## Development Commands

### Start Development Server

```cmd
C:\Ruby33-x64\bin\ridk enable
bundle exec jekyll s
```

- Serves site at `http://127.0.0.1:4000`
- Automatically rebuilds when files change
- Press Ctrl+C to stop

### Production Build

```cmd
C:\Ruby33-x64\bin\ridk enable
set JEKYLL_ENV=production
bundle exec jekyll build
```

Or use the Rake task:

```cmd
C:\Ruby33-x64\bin\ridk enable
rake deploy
```

### Clean Cache

```cmd
bundle clean --force
bundle install
```

---

## Troubleshooting

### Error: "Ruby not recognized"

**Solution**: Restart Command Prompt/PowerShell to pickup PATH changes after Ruby installation.

### Error: "bundler: command not found"

**Solution**: Refresh your environment:

```cmd
C:\Ruby33-x64\bin\ridk enable
```

Then try again.

### Error: "Could not find 'eventmachine'" or other gem errors

**Causes**: Native extensions failed to compile. MSYS2 may not be properly installed.

**Solutions**:

1. **Reinstall MSYS2 dev tools:**
   ```cmd
   C:\Ruby33-x64\bin\ridk install
   ```
   Select options: `1,3` (MSYS2 base + development toolchain)

2. **Clean and reinstall gems:**
   ```cmd
   bundle clean --force
   bundle install
   ```

3. **Update Bundler:**
   ```cmd
   gem install bundler --pre
   ```

4. **As last resort, use WSL** (see below)

### Error: "Could not find compiler" / "development tools first"

**Solution**: You need Visual C++ Build Tools or MSYS2 installed.

- Reinstall Ruby with MSYS2: https://rubyinstaller.org/
- Ensure MSYS2 option was selected during Ruby installation

### MSYS2 Not Found Despite Installation

**Solution**: Check if MSYS2 is installed locally:

1. Open Explorer and check: `C:\msys64`
2. If not there, install MSYS2 manually from: https://msys2.github.io/
3. Extract to `C:\msys64`
4. Run: `C:\msys64\msys2.exe` (at least once to initialize)

### Still Having Issues?

Use **Windows Subsystem for Linux (WSL)** instead (Linux environment on Windows):

```bash
# Install WSL (requires Windows 10/11)
wsl --install

# Then follow Linux setup instructions (below)
```

---

## Setup with WSL (Windows 11 / Windows 10)

If Windows Ruby setup is too complex, use WSL for a Linux Ruby environment:

### 1. Install WSL

Open PowerShell as Administrator and run:

```powershell
wsl --install Ubuntu-22.04
```

Restart your computer.

### 2. Setup in WSL Terminal

Open WSL terminal and run:

```bash
# Update package manager
sudo apt update && sudo apt upgrade -y

# Install Ruby and dependencies
sudo apt install ruby ruby-dev ruby-bundler build-essential -y

# Navigate to your project
cd /mnt/c/Users/[YourUsername]/VS\ Code\ repos/petrosylvania-collection-builder

# Install gems
bundle install

# Start development server
bundle exec jekyll s
```

Access site at: **http://127.0.0.1:4000**

---

## Using Docker

If you prefer a containerized setup:

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)

2. Create `Dockerfile` in project root:

```dockerfile
FROM ruby:3.3

WORKDIR /site

RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY Gemfile Gemfile.lock ./

RUN bundle install

EXPOSE 4000

CMD ["bundle", "exec", "jekyll", "s", "--host", "0.0.0.0"]
```

3. Build and run:

```bash
docker build -t petrosylvania-dev .
docker run -p 4000:4000 -v $(pwd):/site petrosylvania-dev
```

---

## Project Structure

```
petrosylvania-collection-builder/
├── Gemfile              # Ruby dependencies
├── Gemfile.lock         # Locked versions (created by bundle)
├── _config.yml          # Jekyll configuration
├── _includes/           # HTML snippets
├── _layouts/            # Page templates
├── _sass/               # SCSS stylesheets
├── _data/               # CSV data files
├── _plugins/            # Custom Jekyll plugins
├── assets/              # Images, CSS, JS
├── docs/                # Documentation
├── pages/               # Content pages
├── objects/             # Collection items
└── _site/               # Built website (generated by Jekyll)
```

---

## Development Workflow

1. **Edit your content** in `pages/`, `_includes/`, `_layouts/`, `_sass/`, etc.

2. **Jekyll automatically rebuilds** when files change (when `bundle exec jekyll s` is running)

3. **Refresh your browser** to see changes at http://127.0.0.1:4000

4. **For CSS changes**: Changes to `_sass/` files rebuild automatically

5. **For config changes** (`_config.yml`): Stop server (Ctrl+C) and restart

6. **For plugin changes**: Stop server and restart

---

## Common Development Tasks

### Edit Homepage

File: `pages/about.md` or `_layouts/home.html`

### Add/Edit Navigation

File: `_data/config-nav.csv`

### Change Colors/Theme

File: `_sass/_custom.scss` or `_data/config-theme-colors.csv`

### Edit Maps

File: `_includes/js/layeredmap-js.html`

### Add Collection Items

File: `objects/object_list.csv`

---

## Performance Tips

- Development server is slow when building production assets
- Use `JEKYLL_ENV=development` (default) for faster builds
- Large image collections may take time to process
- Consider using `--incremental` flag for faster incremental builds:
  ```cmd
  bundle exec jekyll s --incremental
  ```

---

## Git Workflow

Before pushing changes:

```bash
git add .
git commit -m "Description of changes"
git push origin main
```

**Do NOT commit:**
- `_site/` folder (generated automatically)
- `Gemfile.lock` (if working with others on different systems)
- Sensitive data or `.env` files

---

## References

- [CollectionBuilder Documentation](https://collectionbuilder.github.io/)
- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [Ruby on Windows Guide](https://rubyinstaller.org/development/)
- [MSYS2 Setup Guide](https://www.msys2.org/)
- [WSL Documentation](https://learn.microsoft.com/en-us/windows/wsl/)

---

## Questions or Issues?

Check the project's `docs/` folder for more detailed guides or the main [README.md](../README.md).
