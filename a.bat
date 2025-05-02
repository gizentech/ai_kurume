@echo off
netsh interface show interface | find "イーサネット" | find "有効" > nul
if %errorlevel% equ 0 (
    echo イーサネットがオンのため、オフにしてWi-Fiをオンにします...
    netsh interface set interface "イーサネット" disable
    netsh interface set interface "Wi-Fi" enable
) else (
    netsh interface show interface | find "Wi-Fi" | find "有効" > nul
    if %errorlevel% equ 0 (
        echo Wi-Fiがオンのため、オフにしてイーサネットをオンにします...
        netsh interface set interface "Wi-Fi" disable
        netsh interface set interface "イーサネット" enable
    ) else (
        echo どちらのインターフェースも有効になっていないようです。
        echo イーサネットをオンにします。
        netsh interface set interface "イーサネット" enable
    )
)
pause