WE NEED TO REFACTOR POINTERLOCK FUNCTIONALITY.

GOALS:
pointerlock can click into the game and does not ever leave unless the user pushes esc.  User can click back in to re-engage.  When mouse is not engaged with pointerlock then keybaord and mouse do not control anything.  Game should be able to run in background and mouse/keyboard should not be able to control anything, but the gamepad can control everything.

Toggling between views/modes with V: FPS, Third Person, Free Camera, RTS view, and building mode all should be possible while pointerlock is active or inactive.  TOGGLING THESE VIEWS AND MODES SHOULD NEVER AFFECT THE POINTERLOCK STATUS.

After refactor all views and modes should maintain functional status.  Building mode should allow us to view template buildings and place them with communication with server and placement validation, and subsequent client side rendering.

CURRENT STATE:
When game starts there is the click to play screen.  User clicks into it or pushes gamepad button.  then user pushses esc and pointerlock exits (correct).  But then they are unable to click back into the game to regain pointerlock and engage game with mouse + keyboard.

When user pushes B to enter buildmode it functions correctly except it leaves pointerlocker which it should not do.  Entering buildmode should not have any affect on pointerlock status.  but it should allow a the user to freely move the game cursor to build buildings.