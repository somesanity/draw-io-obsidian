/**
 * Main
 */
if (typeof AJS === 'undefined') // conf insists on pulling in this file into batch.js for atlas-debug
{
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
}