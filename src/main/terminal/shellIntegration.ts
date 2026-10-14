/**
 * Startup snippets that make each shell report its working directory with OSC 7
 * (`ESC ] 7 ; file://host/path BEL`) before every prompt — the same convention used by
 * VS Code, Windows Terminal and iTerm2. They always load the user's own configuration
 * first, so prompts, aliases and PATH stay exactly as the user set them up.
 */

/** Wraps whatever prompt the user has (including oh-my-posh / starship). */
export const POWERSHELL = `
$global:__VeltrixPrompt = $function:prompt
function global:prompt {
  $location = $executionContext.SessionState.Path.CurrentLocation
  $osc = ''
  if ($location.Provider.Name -eq 'FileSystem') {
    $osc = "$([char]27)]7;file://localhost/$($location.ProviderPath -replace '\\\\', '/')$([char]7)"
  }
  $osc + (& $global:__VeltrixPrompt)
}
`

/** cmd.exe has no hooks; the PROMPT variable itself emits the sequence ($E = ESC, $P = path). */
export const CMD_PROMPT = '$E]7;file://localhost/$P$E\\$P$G'

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
__veltrix_report_cwd() { printf '\\e]7;file://localhost%s\\a' "$PWD"; }
PROMPT_COMMAND="__veltrix_report_cwd\${PROMPT_COMMAND:+; $PROMPT_COMMAND}"
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
  '.zshrc': zshForward(
    '.zshrc',
    `__veltrix_report_cwd() { printf '\\e]7;file://localhost%s\\a' "$PWD" }
autoload -Uz add-zsh-hook
add-zsh-hook precmd __veltrix_report_cwd
`,
  ),
  // Last file of a login shell: give the user their own ZDOTDIR back for the session.
  '.zlogin': zshForward('.zlogin', 'ZDOTDIR=$VELTRIX_USER_ZDOTDIR\n'),
}
