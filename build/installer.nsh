; Instalador do ZapBerry: fecha o app sozinho antes de instalar/atualizar.
;
; Por que existe: o ZapBerry fica na bandeja ao fechar a janela e roda em vários processos (WhatsApp, GPU...). O instalador padrão
; do electron-builder tenta fechar com `%SYSTEMROOT%\System32\cmd.exe /c taskkill ...`, mas o nsExec NÃO expande %SYSTEMROOT%:
; o comando falha em silêncio (testado nesta máquina) e aparece "Não é possível fechar o ZapBerry. Feche a janela e clique em Repetir".
; Aqui chamamos o taskkill.exe pelo caminho do Windows ($SYSDIR), que funciona, e encerramos o ZapBerry.exe e tudo que ele abriu.
; (O instalador e o desinstalador têm outros nomes de arquivo, então não se encerram por engano.)
!macro customCheckAppRunning
  nsExec::Exec `"$SYSDIR\taskkill.exe" /F /T /IM "${APP_EXECUTABLE_FILENAME}"`
  Pop $R0
  Sleep 1500
  ; segunda passada: pega o que o app reabriu ou o que demorou a sair
  nsExec::Exec `"$SYSDIR\taskkill.exe" /F /T /IM "${APP_EXECUTABLE_FILENAME}"`
  Pop $R0
  Sleep 1000
!macroend
