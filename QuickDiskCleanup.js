//Quick Disk Cleanup script
//smeggysmeg https://github.com/smeggysmeg/QuickDiskCleanup
var FIX   = "Disk Cleanup";		
var TITLE = "Disk Cleanup";
var wsh   = WScript.CreateObject("WScript.Shell");
var now   = new Date();
var old   = now.getTime() - 24*60*60*1000;
var fso   = WScript.CreateObject("Scripting.FileSystemObject");
var env   = wsh.Environment;
var nfiles = 0;
var nbytes = 0;
var windir = fso.GetSpecialFolder(0);
var sysdir = fso.GetSpecialFolder(1);

function walktree(dirname, wipe) {
	var err = 0;
	try {
		var dir = fso.GetFolder(dirname);
  	} catch(err) { return err; }
	for (var e = new Enumerator(dir.files); !e.atEnd(); e.moveNext()) {
		var file = e.item();
		if ( Date.parse(file.DateLastModified) > old )
			continue;
		nbytes += file.Size;
		nfiles++;
		if ( wipe ) {
			try { file.Delete(1); } catch (err) {}
		}
	}
	for (var e = new Enumerator(dir.subFolders); !e.atEnd(); e.moveNext()) {
		var folder = e.item();
		walktree(folder, wipe);
		if ( wipe ) {
			var t = new Enumerator(folder.files);
			if ( t.atEnd() )
				try { folder.Delete(0); } catch (err) {}
		}
	}
	return null;
}

// List of directories to clean
var junk = [];

function AddJunk(name, dir)
{
	dir = dir.replace(/\\$/, "");
	if ( dir == sysdir || dir == windir ) {
		var msg = "This system has a serious configuration error!\n\n";
		msg += "The directory for "+name+" is set to "+dir+", which is ";
		msg += "a crucial Windows directory. Fix this immediately!\n\n";
		msg += "Because of this problem, no changes will be made.";
		wsh.Popup(msg,0,TITLE,16);
		WScript.Quit(1);
	}
	junk[junk.length] = dir;
}


var msg = "Do you want to run '"+FIX+"' ? It may take a\n";
msg += "minute or two to survey files for cleanup, and you will then\n";
msg += "be shown a list of files that you can approve for deletion.";
yn = wsh.Popup(msg,0,TITLE,68);
if ( yn != 6 ) {
	wsh.Popup("Cancelled at your request. No changes made.",0,TITLE,48);
	WScript.Quit(1);
}


// Recyle Bins on all drives
for (var d = new Enumerator(fso.Drives); !d.atEnd(); d.moveNext()) {
	var drv = d.item();
	if ( drv.DriveType != 2 || !drv.IsReady )
		continue;
	AddJunk("Recycle Bin", drv.DriveLetter + ":\\RECYCLED");
}

// Temporary file directory
var tfd = fso.GetSpecialFolder(2).Path;
if ( !tfd.match(/temp/i) ) {
	var msg = "This system has a potential configuration error!\n\n";
	msg += "Temp directory: "+tfd+"\n";
	msg += "Because of this problem, no changes will be made.";
	wsh.Popup(msg,0,TITLE,16);
	WScript.Quit(1);
}
AddJunk("Temp files", tfd);

// Internet Explorer cache
try {
	var ie = wsh.RegRead("HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders\\Cache");
	if ( ie && fso.FolderExists(ie) )
		AddJunk("IE Cache", ie.replace(/\\$/, ""));
} catch(err) {}


// .CHK files in root
var chks = [];
for (var d = new Enumerator(fso.Drives); !d.atEnd(); d.moveNext()) {
	var drv = d.item();
	if ( drv.DriveType != 2 || !drv.IsReady )
		continue;
	var dir = fso.GetFolder(drv.DriveLetter+":\\");
	for (var e = new Enumerator(dir.files); !e.atEnd(); e.moveNext()) {
		var file = e.item();
		if ( fso.GetExtensionName(file.Name) == "CHK" &&
			 Date.parse(file.DateLastModified) < old ) {
			chks[chks.length] = drv.DriveLetter+":\\"+file.Name;
			nbytes += file.Size;
			nfiles++;
		}
	}
}

if ( !nfiles ) {
	wsh.Popup("No cleanup currently needs to be performed.",0,TITLE,64);
	WScript.Quit(0);
}

var msg = "WARNING: ALL files in these directories will be deleted:\n\n"+junk.join("\n")+"\n\n";
if ( chks.length ) {
	msg += "These files will also be deleted:\n";
	msg += (chks.length<4)?chks.join(", "):"*.CHK in all drive roots";
	msg += "\n\n";
}
msg += "Total files: "+nfiles+"\nTotal size: "+Math.round(100*nbytes/(1024*1024))/100+"MB\n\n";
msg += "Files modified in the past 24 hours will not be deleted.\n\nDo you want to continue?";
var yn = wsh.Popup(msg,0,TITLE,36);
if ( yn != 6 ) {
	wsh.Popup("Cancelled at your request. No changes made.",0,TITLE,48);
	WScript.Quit(1);
}

// Delete the files now
for ( var i=0; i < junk.length; i++ ) {
	walktree(junk[i], 1);
}
for ( var i=0; i < chks.length; i++ ) {
	var f = fso.GetFile(chks[i]);
	f.Delete(0);
}

wsh.Popup(" '"+FIX+"'  is complete.",0,TITLE,64);
WScript.Quit(0);


