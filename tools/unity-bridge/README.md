# Unity → page bridge (in-game Exit button)

Makes your in-game **Exit** button close the full-screen embed on the portfolio,
the way Stop works in the Unity editor.

You do **not** need this for the site to work. `Esc`, the on-screen **Exit**
button in the theater bar, and clicking the backdrop all close the game already.
This is only so the button *inside your game* does it too.

---

## 1. Copy the plugin

```
tools/unity-bridge/PortfolioBridge.jslib
        ↓
<YourUnityProject>/Assets/Plugins/WebGL/PortfolioBridge.jslib
```

The path matters. Unity only compiles `.jslib` files found under
`Assets/Plugins/WebGL/`.

## 2. Add the C# wrapper

Create `Assets/Scripts/PortfolioBridge.cs`:

```csharp
using UnityEngine;
using System.Runtime.InteropServices;

/// Closes the browser embed that is hosting this build.
/// No-ops safely in the editor and in non-WebGL players.
public static class PortfolioBridge
{
#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")] private static extern void PortfolioBridge_Exit();
    [DllImport("__Internal")] private static extern int  PortfolioBridge_IsEmbedded();
#endif

    /// True when running inside an iframe, so you can hide the Exit button
    /// on a standalone page where quitting has nowhere to go.
    public static bool IsEmbedded
    {
        get
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            return PortfolioBridge_IsEmbedded() == 1;
#else
            return false;
#endif
        }
    }

    public static void Exit()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        PortfolioBridge_Exit();
#else
        // Editor / standalone: behave the way you would expect there instead.
        Application.Quit();
#endif
    }
}
```

## 3. Call it from your Exit button

Replace whatever the button does now — typically `Application.Quit()`, which
**does nothing useful in WebGL** — with:

```csharp
public void OnExitPressed()
{
    PortfolioBridge.Exit();
}
```

Wire that to the button's `onClick` in the inspector, or if you prefer no extra
script, set the inspector call directly to `PortfolioBridge.Exit`.

## 4. Re-export and copy the build

Export WebGL with the same settings as before:

| Setting | Value |
|---|---|
| Compression Format | **Brotli** |
| Decompression Fallback | **Off** |

Then copy `Build/` and `StreamingAssets/` into
`assets/games/unity-game/`, replacing what is there.

**The export's own `index.html` does not matter — copy it or don't.** The site
does not load it. The page that actually gets embedded is:

```
assets/games/host/unity-game.html
```

It deliberately lives *outside* the build folder, because every Unity export
writes a fresh `index.html` into the build folder and would destroy anything
hand-edited there. The host page does two things Unity's template gets wrong for
an embed:

- Unity hard-codes the canvas to `1920x1080` with an inline style, so in any
  container narrower than that it is **clipped, not scaled**. In fullscreen
  theater mode you would see the top-left corner of the game. The host page
  makes the canvas fill its container instead.
- It defines `window.PortfolioBridge`, which is what the `.jslib` above talks
  to. Without it the Exit button has nothing to call.

So re-export as often as you like. The only time the host page needs editing:

| If you change | Update in `assets/games/host/unity-game.html` |
|---|---|
| Unity **Product Name** (this sets the build file stem, e.g. `JWF`) | `STEM` |
| The folder name `unity-game` | `BUILD` and `STREAMING` |

To open the build on its own, outside the portfolio page:

```
http://localhost:8080/assets/games/host/unity-game.html
```

---

## Testing without touching Unity

The bridge is reachable from the browser console, so you can verify the page
side before wiring anything up in C#. With the game open in theater mode:

```js
document.querySelector('.gt-iframe').contentWindow.ExitGame()
```

The theater should close with the exit animation. If it does, the page half
works and anything left is on the Unity side.

---

## How it works

```
C# button  →  PortfolioBridge.Exit()
           →  PortfolioBridge_Exit()            (.jslib, inside the build)
           →  window.PortfolioBridge.exit()     (assets/games/unity-game/index.html)
           →  parent.postMessage({type:'portfolio:game-exit'})
           →  js/ui.js theater listener         → close animation → iframe removed
```

Removing the iframe is what actually stops the game and releases its memory —
a Unity WebGL build cannot unload itself from inside the document.

The listener also accepts `game:exit` and `unity:quit` as message types, so if
you already have an exit bridge using either name it will just work.
