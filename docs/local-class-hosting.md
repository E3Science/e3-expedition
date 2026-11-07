# Local class hosting

From the E3 project folder, run:

```powershell
npm run class-host
```

The command builds and starts the Colyseus server on port `2567`, exposes the
E3 client on port `8080`, and prints a student URL using the teacher computer's
private IPv4 address. Students on the same LAN open that URL and sign in
normally. Their browser connects back to the teacher computer because the game
server defaults to the page hostname on port `2567`.

Keep the PowerShell window open for the class session. `Ctrl+C` stops both
processes. Windows Firewall must allow Node.js on Private networks. This mode
does not expose the computer to the public internet and will not work across
separate networks without a secure tunnel or managed host.

The public deployed client continues to use `VITE_GAME_SERVER_URL`; local class
hosting does not change the normal hosted path.
