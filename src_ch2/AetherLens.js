import { State } from './state.js';
import { Config } from '../src/config.js';
import { TerminalSystem } from './Terminal.js';
import { AudioSystem } from '../src/systems/Audio.js';

let scene, camera, renderer;
let initialized = false;
let lastToggleTime = 0;
let dynamicObjects = [];

export const AetherLensSystem = {
  init3D: () => {
    const container = document.getElementById('aether-3d-container');
    if (!container) return;

    scene = new THREE.Scene();
    
    // Adjust camera far plane to 1500 to organically limit view without ugly fog
    camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 1500);
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const gridHelper = new THREE.GridHelper(8000, 100, 0xbd00ff, 0xbd00ff);
    gridHelper.material.opacity = 0.15;
    gridHelper.material.transparent = true;
    gridHelper.position.y = -20;
    scene.add(gridHelper);

    // RESTORED PURPLE WIREFRAME VIBE
    const normalMat = new THREE.MeshBasicMaterial({ color: 0xbd00ff, wireframe: true, transparent: true, opacity: 0.3 });
    const relicMat = new THREE.MeshBasicMaterial({ color: 0x9dc183, wireframe: true });

    State.world.structures.forEach(s => {
      const isRelic = s.color === "#9dc183";
      const geo = new THREE.BoxGeometry(s.w, 80, s.h); 
      let mesh = new THREE.Mesh(geo, isRelic ? relicMat : normalMat);
      mesh.position.set(s.x + s.w/2, 20, s.y + s.h/2);
      scene.add(mesh);
    });

    initialized = true;
  },

  update: () => {
    if (!State.ch2.hasAetherLens) return;
    if (!initialized) AetherLensSystem.init3D();

    if (!State.ch2.lens.expanded) {
        camera.position.set(State.player.x, 40, State.player.y);
        
        // CAMERA LOCKS TO PLAYER AIM ANGLE
        let lookDist = 500;
        let lookX = State.player.x + Math.cos(State.player.angle) * lookDist;
        let lookZ = State.player.y + Math.sin(State.player.angle) * lookDist;
        camera.lookAt(lookX, 0, lookZ); 

        // Cleanup old dynamic objects
        dynamicObjects.forEach(m => scene.remove(m));
        dynamicObjects = [];

        const fragMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, wireframe: true });
        const dataMat = new THREE.MeshBasicMaterial({ color: 0xffa500 });
        const fragGeo = new THREE.BoxGeometry(8, 8, 8);
        const dataGeo = new THREE.BoxGeometry(16, 16, 16);

        // Render nearby fragments (within 1200px)
        State.world.fragments.forEach(f => {
            if (f.active && Math.sqrt(Math.pow(State.player.x - f.x, 2) + Math.pow(State.player.y - f.y, 2)) < 1200) {
                let m = new THREE.Mesh(fragGeo, fragMat);
                m.position.set(f.x, 4, f.y);
                scene.add(m);
                dynamicObjects.push(m);
            }
        });

        State.ch2.relics.forEach(r => {
            if (r.spawnedItems && r.relicData && r.relicData.active) {
                let m = new THREE.Mesh(dataGeo, dataMat);
                m.position.set(r.relicData.x, 8, r.relicData.y);
                scene.add(m);
                dynamicObjects.push(m);
            }
        });

        const container = document.getElementById('aether-3d-container');
        if (container && container.clientWidth !== renderer.domElement.width) {
            renderer.setSize(container.clientWidth, container.clientHeight);
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
        }
        renderer.render(scene, camera);
        AetherLensSystem.updateScannerText();
    }
  },

  updateScannerText: () => {
     const textEl = document.getElementById("aether-scanner-text");
     let activeRelicData = State.ch2.relics.find(r => r.spawnedItems && r.relicData && r.relicData.active && Math.sqrt(Math.pow(State.player.x - r.relicData.x, 2) + Math.pow(State.player.y - r.relicData.y, 2)) < 1200);
     let nearbyFragment = State.world.fragments.find(f => f.active && Math.sqrt(Math.pow(State.player.x - f.x, 2) + Math.pow(State.player.y - f.y, 2)) < 1200);

     if (activeRelicData) {
         textEl.innerHTML = "> UNKNOWN DATA PACKET DETECTED.<br>> TYPE: ENCRYPTED RELIC.<br>> ACTION: RETRIEVE FOR DECRYPTION.";
         textEl.style.color = "#ffa500"; textEl.style.borderLeftColor = "#ffa500";
     } else if (nearbyFragment) {
         textEl.innerHTML = "> LOOSE DATA FRAGMENT DETECTED.<br>> STATUS: UNCOMPILED.<br>> ACTION: ABSORB TO INCREASE DATA POOL.";
         textEl.style.color = "#00f3ff"; textEl.style.borderLeftColor = "#00f3ff";
     } else {
         textEl.innerHTML = "> SCANNING NULL SAFETY...<br>> NO ANOMALIES DETECTED NEARBY.";
         textEl.style.color = "var(--aether-color)"; textEl.style.borderLeftColor = "var(--aether-color)";
     }
  },

  toggleFullscreen: () => {
    const now = Date.now();
    if (now - lastToggleTime < 500) return; 
    lastToggleTime = now;

    const wrapper = document.getElementById("aether-lens-wrapper");
    const btn = document.getElementById("btn-aether-expand");
    const viewCol = document.getElementById("aether-view-collapsed");
    const osView = document.getElementById("haxnode-os");
    
    State.ch2.lens.expanded = !State.ch2.lens.expanded;

    if (State.ch2.lens.expanded) {
        if (AudioSystem && AudioSystem.playSFX) AudioSystem.playSFX("term_open");
        wrapper.classList.add("fullscreen");
        btn.innerText = "[MINIMIZE (E)]";
        viewCol.style.display = "none";
        osView.style.display = "flex";
        OS.boot();
    } else {
        if (AudioSystem && AudioSystem.playSFX) AudioSystem.playSFX("term_close");
        wrapper.classList.remove("fullscreen");
        btn.innerText = "[EXPAND (E)]";
        viewCol.style.display = "block";
        osView.style.display = "none";
        
        setTimeout(() => {
            const container = document.getElementById('aether-3d-container');
            if(initialized && container) {
                renderer.setSize(container.clientWidth, container.clientHeight);
                camera.aspect = container.clientWidth / container.clientHeight;
                camera.updateProjectionMatrix();
            }
        }, 350);
    }
  },
  OS: null 
};

// --- HAXNODE OS ---
const OS = {
    activeApp: 'files',
    selectedItem: null,
    ramUsage: 124,

    boot: () => { OS.launchApp(OS.activeApp); OS.updateRAM(); },
    updateRAM: () => {
        OS.ramUsage = 124 + (State.ch2.inventory.length * 14);
        const ramUI = document.getElementById("os-ram-usage");
        if(ramUI) ramUI.innerText = `RAM: ${OS.ramUsage} MB / 1024 MB`;
    },

    launchApp: (appId) => {
        OS.activeApp = appId;
        document.querySelectorAll(".os-icon").forEach(i => i.classList.remove("active"));
        document.getElementById(`os-icon-${appId}`).classList.add("active");
        OS.renderPane2();
        OS.renderPane3();
    },

    selectItem: (id) => {
        OS.selectedItem = State.ch2.inventory.find(i => i.id === id);
        OS.renderPane2();
        OS.renderPane3();
    },

    // --- NEW: CREATING & SAVING FILES ---
    createNewFile: () => {
        let newFile = {
            id: Date.now() + Math.random(),
            type: "note",
            name: `USER_NOTE_${Math.floor(Math.random()*999)}.txt`,
            raw: "Enter notes here...",
            encrypted: false,
            size: 2
        };
        State.ch2.inventory.push(newFile);
        OS.selectedItem = newFile;
        OS.updateRAM();
        OS.launchApp('reader'); // Jump straight into the reader to edit it
    },

    saveFile: () => {
        if (!OS.selectedItem) return;
        const editor = document.getElementById("os-pane-3-content");
        OS.selectedItem.raw = editor.value;
        OS.selectedItem.size = Math.max(2, Math.floor(editor.value.length / 10)); // Dynamic size calculation
        TerminalSystem.log("OS: CHANGES SAVED TO DISK", "safe");
        OS.updateRAM();
        OS.renderPane2();
        OS.renderPane3();
    },

    renderPane2: () => {
        const title = document.getElementById("os-pane-2-title");
        const content = document.getElementById("os-pane-2-content");
        content.innerHTML = "";

        if (OS.activeApp === 'files') {
            title.innerText = "FILE_SYSTEM // ROOT";
            
            // NEW FILE BUTTON
            content.innerHTML = `<button class="os-btn" style="margin-bottom:15px; border-color:#00ffaa; color:#00ffaa;" onclick="window.AetherLens.OS.createNewFile()">[ + NEW TEXT FILE ]</button>`;

            if (State.ch2.inventory.length === 0) {
                content.innerHTML += "<div style='color:#555; text-align:center;'>No data acquired.</div>";
            } else {
                State.ch2.inventory.forEach(item => {
                    let selClass = OS.selectedItem && OS.selectedItem.id === item.id ? 'selected' : '';
                    let formatType = item.type === "script" ? ">_" : (item.type === "note" ? "txt" : "snd");
                    content.innerHTML += `
                        <div class="os-list-item ${selClass}" onclick="window.AetherLens.OS.selectItem(${item.id})">
                            <span>${item.name}</span>
                            <span>[${formatType}]</span>
                        </div>
                    `;
                });

                if (OS.selectedItem) {
                    content.innerHTML += `<div style="margin-top:20px; border-top:1px solid #333; padding-top:10px;">`;
                    if (OS.selectedItem.type === "script") {
                        content.innerHTML += `<button class="os-btn" onclick="window.AetherLens.OS.launchApp('workbench')">[ PUSH TO WORKBENCH ]</button>`;
                    } else {
                        content.innerHTML += `<button class="os-btn" onclick="window.AetherLens.OS.launchApp('reader')">[ OPEN IN READER ]</button>`;
                    }
                    content.innerHTML += `</div>`;
                }
            }
        } 
        else if (OS.activeApp === 'reader') {
            title.innerText = "READER // ACTIONS";
            if (!OS.selectedItem || OS.selectedItem.type === "script") {
                content.innerHTML = "<div style='color:#555;'>Select a valid Text/Audio file from the File System.</div>";
            } else {
                content.innerHTML += `<div style="color:var(--aether-color); margin-bottom:15px;">TARGET:<br>${OS.selectedItem.name}</div>`;
                
                if (OS.selectedItem.encrypted) {
                    content.innerHTML += `<div style="color:#f33; font-size:11px; margin-bottom:15px; border:1px dashed #f33; padding:10px;">[ FILE ENCRYPTED ]<br>Close OS and use Main Terminal:<br><br>> exe.decrypt<br><br>Cost: 200 MB Data</div>`;
                } else {
                    content.innerHTML += `<div style="color:#00ffaa; font-size:11px; margin-bottom:15px;">[ DECRYPTED AND READY ]</div>`;
                }
                content.innerHTML += `<button class="os-btn" style="border-color:#f33; color:#f33;" onclick="window.AetherLens.OS.actionDelete()">[ DELETE FILE ]</button>`;
            }
        }
        else if (OS.activeApp === 'workbench') {
            title.innerText = "WORKBENCH // TERMINAL";
            content.innerHTML = `
                <input type="text" class="os-input" id="os-wb-input" placeholder="Execute OS cmd..." autocomplete="off"/>
                <button class="os-btn" onclick="window.AetherLens.OS.actionInject()">[ INJECT SCRIPT ]</button>
            `;
            if (OS.selectedItem && OS.selectedItem.type === "script") {
                content.innerHTML += `<div style="margin-top:15px; color:#aaa; font-size:11px;">TARGET:<br>${OS.selectedItem.name}</div>`;
                if (OS.selectedItem.encrypted) {
                    content.innerHTML += `<div style="color:#f33; font-size:11px; margin-top:10px;">Close OS and use Main Terminal 'exe.decrypt' (200MB) to unlock.</div>`;
                }
            } else {
                content.innerHTML += `<div style="margin-top:15px; color:#555; font-size:11px;">No script targeted. Select from File System.</div>`;
            }
        }
    },

    renderPane3: () => {
        const title = document.getElementById("os-pane-3-title");
        const editor = document.getElementById("os-pane-3-content");
        
        if (OS.activeApp === 'files') {
            if (!OS.selectedItem) {
                title.innerHTML = "PROPERTIES: NONE";
                editor.value = "Select a file to view properties.";
            } else {
                title.innerHTML = `PROPERTIES: ${OS.selectedItem.name}`;
                let details = `FILE INFORMATION\n----------------\nName: ${OS.selectedItem.name}\nType: ${OS.selectedItem.type.toUpperCase()}\nSize: ${OS.selectedItem.size} KB\nStatus: ${OS.selectedItem.encrypted ? 'ENCRYPTED' : 'CLEARTEXT'}\n\n`;
                editor.value = details;
            }
            editor.readOnly = true;
        } 
        else if (OS.activeApp === 'reader') {
            if (!OS.selectedItem || OS.selectedItem.type === "script") {
                title.innerHTML = "VIEWPORT: IDLE";
                editor.value = "System awaiting valid input stream...";
                editor.readOnly = true;
            } else {
                // SAVING INTEGRATION
                title.innerHTML = `VIEWPORT: ${OS.selectedItem.name} <span class="aether-btn" style="background:var(--aether-color); color:#000; padding:2px 8px; border-radius:2px;" onclick="window.AetherLens.OS.saveFile()">[ SAVE ]</span>`;
                editor.readOnly = false; 
                if (OS.selectedItem.encrypted) {
                    editor.value = "01001000 01100101 01101100 01110000 00100000 01101101 01100101...\n[DATA CORRUPTED/ENCRYPTED]";
                    editor.readOnly = true; // Can't edit encrypted files
                } else {
                    editor.value = OS.selectedItem.raw;
                }
            }
        }
        else if (OS.activeApp === 'workbench') {
            title.innerHTML = "WORKBENCH // SCRIPT VIEWER";
            editor.readOnly = true;
            
            if(OS.selectedItem && OS.selectedItem.type === 'script'){
                 editor.value = `LOADED SCRIPT: ${OS.selectedItem.name}\n\nSOURCE CODE:\n${OS.selectedItem.encrypted ? '***ENCRYPTED BLOCK***' : OS.selectedItem.raw}\n\n>> Ready for INJECTION into Main Terminal.`;
            } else {
                 editor.value = "Awaiting script block...";
            }
        }
    },

    actionDelete: () => {
        if (!OS.selectedItem) return;
        State.ch2.inventory = State.ch2.inventory.filter(i => i.id !== OS.selectedItem.id);
        OS.selectedItem = null;
        OS.updateRAM();
        OS.launchApp('files');
        TerminalSystem.log("OS: FILE DELETED", "error");
    },

    actionInject: () => {
        if (!OS.selectedItem || OS.selectedItem.type !== "script") { TerminalSystem.log("OS: INVALID SCRIPT TARGET", "error"); return; }
        if (OS.selectedItem.encrypted) { TerminalSystem.log("OS: SCRIPT ENCRYPTED.", "error"); return; }
        TerminalSystem.log(`OS: SCRIPT '${OS.selectedItem.name}' INJECTED TO ROOT.`, "safe");
        if(AudioSystem && AudioSystem.playSFX) AudioSystem.playSFX("term_success");
        
        State.ch2.inventory = State.ch2.inventory.filter(i => i.id !== OS.selectedItem.id);
        OS.selectedItem = null;
        OS.updateRAM();
        OS.launchApp('workbench');
    }
};

AetherLensSystem.OS = OS;
window.AetherLens = AetherLensSystem;