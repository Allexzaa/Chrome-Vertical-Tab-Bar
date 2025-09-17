' ========================================
' Chrome Vertical Tab Bar - Silent Launcher
' ========================================
' 
' This script launches the Chrome Vertical Tab Bar application silently
' without showing a command window. Perfect for desktop shortcuts and
' Windows startup automation.
'
' FEATURES:
' - Silent execution (no command window)
' - Automatic path detection
' - Error handling with user feedback
' - Works from any location
'
' USAGE:
' 1. Double-click this file to launch the app silently
' 2. Create desktop shortcut: Right-click → Send to → Desktop
' 3. Auto-start: Copy to Windows Startup folder (Win+R → shell:startup)
' 4. Task Scheduler: Use this file for scheduled startup tasks
'
' REQUIREMENTS:
' - Node.js must be installed
' - npm dependencies must be installed (run 'npm install' first)
'
' TROUBLESHOOTING:
' - If app doesn't start, run 'npm install' in the project folder
' - Check that Node.js is properly installed
' - Ensure start-tab-bar.bat exists in the same directory
'
' ========================================

On Error Resume Next

' Get the directory where this VBS script is located
Dim scriptPath, appDirectory, batFile
scriptPath = WScript.ScriptFullName
appDirectory = Left(scriptPath, InstrRev(scriptPath, "\"))
batFile = appDirectory & "start-tab-bar.bat"

' Create Windows Shell object
Set WshShell = CreateObject("WScript.Shell")

' Check if the batch file exists
Dim fso
Set fso = CreateObject("Scripting.FileSystemObject")

If fso.FileExists(batFile) Then
    ' Launch the application silently
    ' Parameters: command, windowStyle (0=hidden), waitOnReturn (False=don't wait)
    WshShell.Run "cmd /c """ & batFile & """", 0, False
    
    ' Optional: Show a brief notification (comment out if not needed)
    ' WshShell.Popup "Chrome Vertical Tab Bar started successfully!", 2, "Tab Bar Launcher", 64
Else
    ' Show error if batch file is missing
    WshShell.Popup "Error: start-tab-bar.bat not found!" & vbCrLf & vbCrLf & _
                   "Please ensure this file is in the same directory as:" & vbCrLf & _
                   "start-tab-bar.bat" & vbCrLf & vbCrLf & _
                   "Current directory: " & appDirectory, 0, "Chrome Vertical Tab Bar - Error", 16
End If

' Clean up objects
Set WshShell = Nothing
Set fso = Nothing