import { App, Notice, TFile } from "obsidian";
import type { DRAWIO_VIEW } from "../constants";
import type DrawIOPlugin from "../../main";
import { saveOrUpdateDrawioFile } from "../drawio-file-logic";
import { DrawIOView } from "src/classes/drawio-view";

export async function handleDrawioMessage(
    msg: any,
    sourceWindow: Window,
    app: App,
    view: DrawIOView,
    plugin: DrawIOPlugin,
) {
    const port = plugin.settings.port;

    switch (msg.event) {
        case "init":
            console.log("Draw.io отправил сообщение 'init'. Отвечаем 'ready' и загружаем данные, если доступны.");
            view.sendMessageToDrawio({ action: "ready" });

            if (view.currentFile) {
                const fileContent = await app.vault.read(view.currentFile);
                sourceWindow.postMessage(JSON.stringify({ action: "load", xml: fileContent, autosave: 1 }), `http://localhost:${port}`);
            } else {
                sourceWindow.postMessage(JSON.stringify({ action: "load", xml: "<mxGraphModel><root><mxCell id='0'/><mxCell id='1' parent='0'/></root></mxGraphModel>", autosave: 1 }), `http://localhost:${port}`);
            }
            break;
        case "save":
            sourceWindow.postMessage(JSON.stringify({ action: "export", format: "xmlsvg", xml: 1, empty: 1 }), `http://localhost:${port}`);
            break;
        case "export":
            await saveOrUpdateDrawioFile(app, view, msg.data);
            break;
        case "change":
            break;
        case "exit":
            console.log("👋 Пользователь вышел из Draw.io из основного представления");
            break;
        default:
            console.log("Неизвестное событие сообщения Draw.io:", msg.event, msg);
            break;
    }
}