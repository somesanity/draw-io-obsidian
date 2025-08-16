/**
 * Main
 */
if (urlParams['dev'] != '1' && typeof document.createElement('canvas').getContext === "function")
{
	window.addEventListener('load', function()
	{
		mxWinLoaded = true;
		checkAllLoaded();
	});
}
else
{
	App.main();
}
