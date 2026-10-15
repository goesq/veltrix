import { WORDMARK_COLUMNS } from './banner'

/**
 * Startup snippets that make each shell report its working directory with OSC 7
 * (`ESC ] 7 ; file://host/path BEL`) before every prompt — the same convention used by
 * VS Code, Windows Terminal and iTerm2. They always load the user's own configuration
 * first, so aliases and PATH stay exactly as the user set them up.
 *
 * Two optional extras, switched on by environment variables set by ShellLauncher:
 * - `VELTRIX_PROMPT`: replaces the prompt with `➜ folder git:(branch)` (the arrow turns red
 *   when the last command failed).
 * - `VELTRIX_BANNER_*` (banner.ts): the "veltrix" banner with shell, folder and branch. It is
 *   drawn at startup and again after `clear` (and Ctrl+L in bash/zsh), so it stays on top.
 *   Beside the wordmark when the terminal is wide enough, below it when not, and without
 *   the wordmark when the terminal is narrower than it.
 * The branch is read from `.git/HEAD`, never by starting git. The variables are unset once
 * read, so they don't leak into child processes.
 */

/** Without VELTRIX_PROMPT, wraps whatever prompt the user has (including oh-my-posh / starship). */
export const POWERSHELL = `
$global:__VeltrixPrompt = $function:prompt

function global:__VeltrixCwd {
  $location = $executionContext.SessionState.Path.CurrentLocation
  if ($location.Provider.Name -eq 'FileSystem') { $location.ProviderPath }
}

function global:__VeltrixOsc7([string] $path) {
  if (-not $path) { return '' }
  "$([char]27)]7;file://localhost/$($path -replace '\\\\', '/')$([char]7)"
}

function global:__VeltrixGitBranch([string] $path) {
  $dir = $path
  $head = $null
  while ($dir) {
    $git = Join-Path $dir '.git'
    if (Test-Path -LiteralPath $git -PathType Container) { $head = Join-Path $git 'HEAD'; break }
    if (Test-Path -LiteralPath $git -PathType Leaf) {
      $line = Get-Content -LiteralPath $git -TotalCount 1
      if ($line -match '^gitdir:\\s*(.+)$') {
        $gitDir = $Matches[1].Trim()
        if (-not [System.IO.Path]::IsPathRooted($gitDir)) { $gitDir = Join-Path $dir $gitDir }
        $head = Join-Path $gitDir 'HEAD'
      }
      break
    }
    $dir = Split-Path -Parent $dir
  }
  if (-not $head -or -not (Test-Path -LiteralPath $head)) { return $null }
  $ref = "$(Get-Content -LiteralPath $head -TotalCount 1)".Trim()
  if ($ref -match '^ref: refs/heads/(.+)$') { return $Matches[1] }
  $ref.Substring(0, [Math]::Min(7, $ref.Length))
}

if ($env:VELTRIX_PROMPT) {
  function global:prompt {
    $ok = $?
    $e = [char]27
    $path = __VeltrixCwd
    $name = $executionContext.SessionState.Path.CurrentLocation.Path
    $git = ''
    if ($path) {
      $name = if ($path -eq $HOME) { '~' } else { Split-Path -Leaf $path }
      if (-not $name) { $name = $path }
      $branch = __VeltrixGitBranch $path
      if ($branch) { $git = " $e[1;34mgit:($e[0;31m$branch$e[1;34m)" }
    }
    $arrow = if ($ok) { "$e[1;32m" } else { "$e[1;31m" }
    "$(__VeltrixOsc7 $path)$arrow$([char]0x279C) $e[1;36m$name$git$e[0m "
  }
} else {
  function global:prompt {
    "$(__VeltrixOsc7 (__VeltrixCwd))" + (& $global:__VeltrixPrompt)
  }
}

if ($env:VELTRIX_BANNER_ART) {
  $global:__VeltrixBanner = @{
    Art = $env:VELTRIX_BANNER_ART.Split([char]10)
    Version = $env:VELTRIX_BANNER_VERSION
    Shell = $env:VELTRIX_BANNER_SHELL
    Folder = $env:VELTRIX_BANNER_FOLDER
    Tip = $env:VELTRIX_BANNER_TIP
  }

  function global:__VeltrixWriteBanner {
    $banner = $global:__VeltrixBanner
    $e = [char]27
    $path = __VeltrixCwd
    $place = $executionContext.SessionState.Path.CurrentLocation.Path
    $branch = $null
    if ($path) {
      $place = $path
      if ($path -eq $HOME) { $place = '~' }
      elseif ($path.StartsWith($HOME + '\\', [StringComparison]::OrdinalIgnoreCase)) {
        $place = '~' + $path.Substring($HOME.Length)
      }
      $branch = __VeltrixGitBranch $path
    }
    $field = {
      param([string] $label, [string] $value, [string] $color)
      @{ Text = "$e[90m$($label.PadRight(6))$e[0m $color$value$e[0m"; Width = 7 + $value.Length }
    }
    $details = @(
      @{ Text = "$e[1;97mveltrix$e[0m $e[90mv$($banner.Version)$e[0m"; Width = 9 + $banner.Version.Length }
      (& $field 'shell' $banner.Shell '')
      (& $field $banner.Folder $place '')
    )
    if ($branch) { $details += (& $field 'git' $branch "$e[31m") }
    $details += @{ Text = "$e[90m$($banner.Tip)$e[0m"; Width = $banner.Tip.Length }

    $columns = $Host.UI.RawUI.WindowSize.Width
    $widest = ($details | ForEach-Object { $_.Width } | Measure-Object -Maximum).Maximum
    $texts = $details | ForEach-Object { $_.Text }
    $lines = if ($columns -ge ${WORDMARK_COLUMNS} + 4 + $widest) {
      for ($i = 0; $i -lt $banner.Art.Count; $i++) {
        if ($i -lt $texts.Count) { $banner.Art[$i] + '    ' + $texts[$i] } else { $banner.Art[$i] }
      }
    } elseif ($columns -ge ${WORDMARK_COLUMNS}) {
      @($banner.Art) + '' + @($texts)
    } else {
      $texts
    }
    $newline = "$([char]13)$([char]10)"
    [Console]::Write(($lines -join $newline) + $newline + $newline)
  }

  # clear and cls are aliases of Clear-Host: clear as usual, then draw the banner again.
  $global:__VeltrixClearHost = \${function:Clear-Host}
  function global:Clear-Host {
    & $global:__VeltrixClearHost
    __VeltrixWriteBanner
  }

  __VeltrixWriteBanner
}
Remove-Item Env:VELTRIX_BANNER_*, Env:VELTRIX_PROMPT -ErrorAction SilentlyContinue
`

/** cmd.exe has no hooks; the PROMPT variable itself emits the sequence ($E = ESC, $P = path). */
export const CMD_PROMPT = '$E]7;file://localhost/$P$E\\$P$G'

/** cmd.exe can't run code per prompt, so the styled prompt keeps the full path and no branch. */
export const CMD_PROMPT_STYLED = '$E]7;file://localhost/$P$E\\$E[1;32m➜$E[0m $E[1;36m$P$E[0m$S'

export const BASH = `# Veltrix shell integration for bash.
if [ -n "$VELTRIX_SHELL_LOGIN" ]; then
  unset VELTRIX_SHELL_LOGIN
  [ -r /etc/profile ] && . /etc/profile
  for __veltrix_file in ~/.bash_profile ~/.bash_login ~/.profile; do
    if [ -r "$__veltrix_file" ]; then . "$__veltrix_file"; break; fi
  done
  unset __veltrix_file
else
  [ -r ~/.bashrc ] && . ~/.bashrc
fi

__veltrix_status=0
__veltrix_git=''

# Sets __veltrix_branch from the nearest .git/HEAD, without starting a git process.
__veltrix_git_branch() {
  local dir=$PWD head='' line
  __veltrix_branch=''
  while [ -n "$dir" ]; do
    if [ -d "$dir/.git" ]; then head=$dir/.git/HEAD; break; fi
    if [ -f "$dir/.git" ]; then
      read -r line < "$dir/.git"
      line=\${line#gitdir: }
      case $line in /*|?:*) ;; *) line=$dir/$line ;; esac
      head=$line/HEAD
      break
    fi
    dir=\${dir%/*}
  done
  [ -n "$head" ] && [ -r "$head" ] || return 0
  read -r line < "$head"
  case $line in
    'ref: refs/heads/'*) __veltrix_branch=\${line#ref: refs/heads/} ;;
    *) __veltrix_branch=\${line:0:7} ;;
  esac
}

# Runs first in PROMPT_COMMAND and hands the last exit status on to whatever follows.
__veltrix_precmd() {
  local status=$?
  __veltrix_status=$status
  printf '\\e]7;file://localhost%s\\a' "$PWD"
  if [ -n "$__veltrix_prompt" ]; then
    __veltrix_git_branch
    if [ -n "$__veltrix_branch" ]; then
      __veltrix_git=$' \\001\\e[1;34m\\002git:(\\001\\e[0;31m\\002'"$__veltrix_branch"$'\\001\\e[1;34m\\002)'
    else
      __veltrix_git=''
    fi
  fi
  return $status
}
PROMPT_COMMAND="__veltrix_precmd\${PROMPT_COMMAND:+; $PROMPT_COMMAND}"

if [ -n "$VELTRIX_PROMPT" ]; then
  __veltrix_prompt=1
  PS1='\\[\\e[1;$(( __veltrix_status ? 31 : 32 ))m\\]➜ \\[\\e[1;36m\\]\\W\${__veltrix_git}\\[\\e[0m\\] '
fi

if [ -n "$VELTRIX_BANNER_ART" ]; then
  mapfile -t __veltrix_art <<< "$VELTRIX_BANNER_ART"
  __veltrix_banner_version=$VELTRIX_BANNER_VERSION
  __veltrix_banner_shell=$VELTRIX_BANNER_SHELL
  __veltrix_banner_folder=$VELTRIX_BANNER_FOLDER
  __veltrix_banner_tip=$VELTRIX_BANNER_TIP

  __veltrix_banner() {
    local place=$PWD size columns width=0 w i folder
    case $place in "$HOME") place='~' ;; "$HOME"/*) place="~\${place#"$HOME"}" ;; esac
    printf -v folder '%-6s' "$__veltrix_banner_folder"
    __veltrix_git_branch
    local -a details=(
      $'\\e[1;97mveltrix\\e[0m \\e[90mv'"$__veltrix_banner_version"$'\\e[0m'
      $'\\e[90mshell \\e[0m '"$__veltrix_banner_shell"
      $'\\e[90m'"$folder"$'\\e[0m '"$place"
    )
    local -a widths=($((9 + \${#__veltrix_banner_version})) $((7 + \${#__veltrix_banner_shell})) $((7 + \${#place})))
    if [ -n "$__veltrix_branch" ]; then
      details+=($'\\e[90mgit   \\e[0m \\e[31m'"$__veltrix_branch"$'\\e[0m')
      widths+=($((7 + \${#__veltrix_branch})))
    fi
    details+=($'\\e[90m'"$__veltrix_banner_tip"$'\\e[0m')
    widths+=(\${#__veltrix_banner_tip})
    for w in "\${widths[@]}"; do [ "$w" -gt "$width" ] && width=$w; done

    size=$(stty size 2>/dev/null)
    columns=\${size#* }
    case $columns in ''|*[!0-9]*) columns=0 ;; esac
    if [ "$columns" -ge $((${WORDMARK_COLUMNS} + 4 + width)) ]; then
      for i in "\${!__veltrix_art[@]}"; do
        if [ -n "\${details[i]}" ]; then
          printf '%s    %s\\r\\n' "\${__veltrix_art[i]}" "\${details[i]}"
        else
          printf '%s\\r\\n' "\${__veltrix_art[i]}"
        fi
      done
    elif [ "$columns" -ge ${WORDMARK_COLUMNS} ]; then
      printf '%s\\r\\n' "\${__veltrix_art[@]}" '' "\${details[@]}"
    else
      printf '%s\\r\\n' "\${details[@]}"
    fi
    printf '\\r\\n'
  }

  # Clear as usual, then draw the banner again; Ctrl+L does the same.
  clear() {
    command clear 2>/dev/null || printf '\\e[H\\e[2J\\e[3J'
    __veltrix_banner
  }
  bind -x '"\\C-l": clear' 2>/dev/null

  __veltrix_banner
fi
unset VELTRIX_BANNER_ART VELTRIX_BANNER_VERSION VELTRIX_BANNER_SHELL VELTRIX_BANNER_FOLDER VELTRIX_BANNER_TIP VELTRIX_PROMPT
`

const ZSH_EXTRAS = `__veltrix_report_cwd() { printf '\\e]7;file://localhost%s\\a' "$PWD" }
autoload -Uz add-zsh-hook
add-zsh-hook precmd __veltrix_report_cwd

# Sets __veltrix_branch from the nearest .git/HEAD, without starting a git process.
__veltrix_git_branch() {
  local dir=$PWD head= line
  __veltrix_branch=
  while [[ -n $dir ]]; do
    if [[ -d $dir/.git ]]; then head=$dir/.git/HEAD; break; fi
    if [[ -f $dir/.git ]]; then
      read -r line < $dir/.git
      line=\${line#gitdir: }
      [[ $line == /* ]] || line=$dir/$line
      head=$line/HEAD
      break
    fi
    dir=\${dir%/*}
  done
  [[ -n $head && -r $head ]] || return 0
  read -r line < $head
  if [[ $line == 'ref: refs/heads/'* ]]; then
    __veltrix_branch=\${line#ref: refs/heads/}
  else
    __veltrix_branch=\${line[1,7]}
  fi
}

if [[ -n $VELTRIX_PROMPT ]]; then
  setopt prompt_subst
  __veltrix_git_info() {
    __veltrix_git_branch
    if [[ -n $__veltrix_branch ]]; then
      __veltrix_git=" %B%F{blue}git:(%F{red}\${__veltrix_branch//\\%/%%}%F{blue})%f%b"
    else
      __veltrix_git=
    fi
  }
  add-zsh-hook precmd __veltrix_git_info
  PROMPT='%B%(?.%F{green}.%F{red})➜%f %F{cyan}%c%f%b\${__veltrix_git} '
fi

if [[ -n $VELTRIX_BANNER_ART ]]; then
  __veltrix_art=("\${(@f)VELTRIX_BANNER_ART}")
  __veltrix_banner_version=$VELTRIX_BANNER_VERSION
  __veltrix_banner_shell=$VELTRIX_BANNER_SHELL
  __veltrix_banner_folder=$VELTRIX_BANNER_FOLDER
  __veltrix_banner_tip=$VELTRIX_BANNER_TIP

  __veltrix_banner() {
    local place=\${(%):-%~} width=0 w i
    __veltrix_git_branch
    local -a details widths
    details=(
      $'\\e[1;97mveltrix\\e[0m \\e[90mv'"$__veltrix_banner_version"$'\\e[0m'
      $'\\e[90mshell \\e[0m '"$__veltrix_banner_shell"
      $'\\e[90m'"\${(r:6:)__veltrix_banner_folder}"$'\\e[0m '"$place"
    )
    widths=($((9 + \${#__veltrix_banner_version})) $((7 + \${#__veltrix_banner_shell})) $((7 + \${#place})))
    if [[ -n $__veltrix_branch ]]; then
      details+=($'\\e[90mgit   \\e[0m \\e[31m'"$__veltrix_branch"$'\\e[0m')
      widths+=($((7 + \${#__veltrix_branch})))
    fi
    details+=($'\\e[90m'"$__veltrix_banner_tip"$'\\e[0m')
    widths+=(\${#__veltrix_banner_tip})
    for w in $widths; do (( w > width )) && width=$w; done

    if (( COLUMNS >= ${WORDMARK_COLUMNS} + 4 + width )); then
      for i in {1..\${#__veltrix_art}}; do
        if (( i <= \${#details} )); then
          printf '%s    %s\\r\\n' "\${__veltrix_art[i]}" "\${details[i]}"
        else
          printf '%s\\r\\n' "\${__veltrix_art[i]}"
        fi
      done
    elif (( COLUMNS >= ${WORDMARK_COLUMNS} )); then
      printf '%s\\r\\n' "\${__veltrix_art[@]}" '' "\${details[@]}"
    else
      printf '%s\\r\\n' "\${details[@]}"
    fi
    printf '\\r\\n'
  }

  # Clear as usual, then draw the banner again; Ctrl+L does the same.
  clear() {
    command clear
    __veltrix_banner
  }
  __veltrix_clear_screen() {
    zle -I
    clear
  }
  zle -N __veltrix_clear_screen
  bindkey '^L' __veltrix_clear_screen

  __veltrix_banner
fi
unset VELTRIX_BANNER_ART VELTRIX_BANNER_VERSION VELTRIX_BANNER_SHELL VELTRIX_BANNER_FOLDER VELTRIX_BANNER_TIP VELTRIX_PROMPT
`

/**
 * zsh reads its startup files from $ZDOTDIR. Veltrix points ZDOTDIR at these files, each of
 * which sources the user's own file (with ZDOTDIR temporarily restored), then hands back.
 */
const zshForward = (file: string, after = ''): string => `# Veltrix shell integration for zsh.
VELTRIX_ZDOTDIR=$ZDOTDIR
ZDOTDIR=\${VELTRIX_USER_ZDOTDIR:-$HOME}
[[ -r $ZDOTDIR/${file} ]] && . $ZDOTDIR/${file}
VELTRIX_USER_ZDOTDIR=$ZDOTDIR
ZDOTDIR=$VELTRIX_ZDOTDIR
${after}`

export const ZSH_FILES: Record<string, string> = {
  '.zshenv': zshForward('.zshenv'),
  '.zprofile': zshForward('.zprofile'),
  '.zshrc': zshForward('.zshrc', ZSH_EXTRAS),
  // Last file of a login shell: give the user their own ZDOTDIR back for the session.
  '.zlogin': zshForward('.zlogin', 'ZDOTDIR=$VELTRIX_USER_ZDOTDIR\n'),
}
