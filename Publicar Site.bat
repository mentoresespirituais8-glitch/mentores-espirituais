@echo off
title Publicar Site - Mentores Espirituais
echo.
echo A enviar as alteracoes para o GitHub...
echo (o Vercel e o Render publicam automaticamente a seguir)
echo.
cd /d "%~dp0"
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo ERRO: nao foi possivel enviar. Verifica a ligacao a internet
    echo ou se o GitHub pede login numa janela.
) else (
    echo.
    echo Feito! O site atualiza-se em 2-5 minutos:
    echo   https://mentores-espirituais.vercel.app
)
echo.
pause
