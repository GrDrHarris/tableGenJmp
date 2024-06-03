// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';


async function openFile(file: string, lineNo: number)
{
	const editor = vscode.window.activeTextEditor;
	if(!editor)
		return;
	if(editor.document.uri.path.toString() != file)
	{
		vscode.commands.executeCommand('vscode.open', vscode.Uri.file(file));
	}
	setTimeout((l) => {
		const editor = vscode.window.activeTextEditor;
		if(!editor)
			return;
		const position = editor.selection.active;
		console.log('cursor is at ' + position.line);
		l = l - position.line - 1;
		if(l < 0)
		{
			l = -l;
			vscode.commands.executeCommand('cursorMove', {'to':'up', 'by':'line', 'value': l});
		}else if(l > 0){
			vscode.commands.executeCommand('cursorMove', {'to':'down', 'by':'line', 'value': l});
		}
	}, 100, lineNo);
}
function isNameChar(c: string): boolean
{
	if(!isNaN(Number(c)))
		return true;
	if(c.toLowerCase() !== c.toUpperCase())
		return true;
	return false;
}
function solve(file: string, target: string, incPath: string[], includePwd: Boolean, vis: Set<string>) : boolean
{
	if(vis.has(file))
		return false;
	console.log('searching file \"' + file + "\"");
	vis.add(file);
	const lines = fs.readFileSync(file).toString().split('\n');
	const toBeRead: string[] = [];
	var lineNo = 0;
	for(var lineNo:number = 1; lineNo <= lines.length; lineNo++)
	{
		const line = lines[lineNo - 1];
		const trimed = line.trim();
		if(trimed.startsWith("include \""))
			toBeRead.push(trimed.substring(9, trimed.length-1));
		else if(trimed.startsWith("def "))
		{
			if(target == trimed.substring(4, 4 + target.length) && !isNameChar(trimed.charAt(4 + target.length)))
			{
				openFile(file, lineNo);
				return true;
			}
		}else if(trimed.startsWith("class "))
		{
			if(target == trimed.substring(6, 6 + target.length) && !isNameChar(trimed.charAt(6 + target.length)))
			{
				openFile(file, lineNo);
				return true;
			}
		}
	}
	const curDir = path.dirname(file);
	for(var i: number = 0; i < toBeRead.length; i++)
	{
		const childFile = toBeRead[i];
		var exist = false;
		for(var j: number = 0; j < incPath.length; j++)
		{
			const absChildFile = path.join(incPath[j], childFile);
			if(fs.existsSync(absChildFile))
			{
				exist = true;
				if(solve(absChildFile, target, incPath, includePwd, vis))
					return true;
				break;
			}
		}
		const absChildFile = path.join(curDir, childFile);
		if(fs.existsSync(absChildFile))
		{
			exist = true;
			if(solve(absChildFile, target, incPath, includePwd, vis))
				return true;
		}
		if(!exist)
		{
			vscode.window.showWarningMessage('file \"' + childFile + '\" included by \"' + file + '\" can not be found!');
		}
	}
	return false;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	//console.log('Congratulations, your extension "tablegenjmp" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('tablegenjmp.jumptodef', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		const editor = vscode.window.activeTextEditor;
		if(!editor)
			return;
    	const cursorPosition = editor.selection.start;
		const wordRange = editor.document.getWordRangeAtPosition(cursorPosition);
		const highlight = editor.document.getText(wordRange);
		const config = vscode.workspace.getConfiguration("tablegenjmp");
		const pathList = config.get<Array<string>>("includePath");
		const includeCurrentDir = config.get<Boolean>("includeCurrentDir");
		if(pathList == undefined || includeCurrentDir == undefined)
		{
			vscode.window.showWarningMessage('include path undefined! abort!');
			return;
		}
		const vis = new Set<string>();
		if(!solve(editor.document.uri.path, highlight, pathList, includeCurrentDir, vis))
			vscode.window.showInformationMessage('def of ' + highlight + ' not found.');
		//
		//vscode.window.showInformationMessage('tableJmp called from file ' + editor.document.uri + ' at word ' + highlight);
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
