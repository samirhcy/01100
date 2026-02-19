export const DialogueSystem = {
  timeoutId: null,
  initialized: false,

  init: () => {
    if (DialogueSystem.initialized) return;

    const style = document.createElement("style");
    style.innerHTML = `
      #dialogue-container {
        position: absolute;
        top: 50%;
        left: 50%;
        /* Exactly centered on the player */
        transform: translate(0, 0); 
        pointer-events: none;
        z-index: 500;
      }
      
      /* Step 1: Diagonal line originating from the center */
      .line-diagonal {
        position: absolute;
        top: 0;
        left: 0;
        width: 0;
        height: 2px;
        background: #fff;
        box-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
        transform-origin: left center;
        /* Angles the line 35 degrees up and right */
        transform: rotate(-35deg); 
        transition: width 0.15s ease-out;
      }

      /* Step 2: Horizontal line moving right */
      .line-horizontal {
        position: absolute;
        /* Positioned at the exact end of the 40px diagonal line */
        top: -23px;  
        left: 33px;  
        width: 0;
        height: 2px;
        background: #fff;
        box-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
        transform-origin: left center;
        transition: width 0.15s ease-out 0.15s; 
      }

      /* Step 3: The Box appearing */
      .dialogue-box {
        position: absolute;
        /* Aligns vertical center of the box with the horizontal line */
        top: -23px; 
        left: 65px; /* Starts at the end of the horizontal line */
        background: #fff;
        color: #333;
        padding: 10px 16px;
        font-family: "Inconsolata", monospace;
        font-size: 14px;
        font-weight: bold;
        border-radius: 2px;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.8);
        max-width: 280px;
        width: max-content;
        opacity: 0;
        /* TranslateY exactly centers it, TranslateX gives it the pop-in slide */
        transform: translateY(-50%) translateX(-10px);
        transition: opacity 0.2s ease-out 0.3s, transform 0.2s ease-out 0.3s;
        border-left: 4px solid #111;
        line-height: 1.4;
      }

      /* --- ACTIVE ANIMATION STATES --- */
      #dialogue-container.active .line-diagonal { width: 40px; }
      #dialogue-container.active .line-horizontal { width: 30px; }
      #dialogue-container.active .dialogue-box {
        opacity: 1;
        transform: translateY(-50%) translateX(0);
      }
    `;
    document.head.appendChild(style);

    const container = document.createElement("div");
    container.id = "dialogue-container";

    const lineDiagonal = document.createElement("div");
    lineDiagonal.className = "line-diagonal";

    const lineHorizontal = document.createElement("div");
    lineHorizontal.className = "line-horizontal";

    const box = document.createElement("div");
    box.className = "dialogue-box";
    box.id = "dialogue-text";

    container.appendChild(lineDiagonal);
    container.appendChild(lineHorizontal);
    container.appendChild(box);

    const uiLayer = document.getElementById("ui-layer");
    if (uiLayer) uiLayer.appendChild(container);

    DialogueSystem.initialized = true;
  },

  show: (text, duration = 4000) => {
    DialogueSystem.init();

    const container = document.getElementById("dialogue-container");
    const box = document.getElementById("dialogue-text");

    container.classList.remove("active");
    
    setTimeout(() => {
      box.innerText = text;
      container.classList.add("active");

      if (DialogueSystem.timeoutId) clearTimeout(DialogueSystem.timeoutId);

      DialogueSystem.timeoutId = setTimeout(() => {
        DialogueSystem.hide();
      }, duration);
    }, 50);
  },

  hide: () => {
    const container = document.getElementById("dialogue-container");
    if (container) container.classList.remove("active");
  }
};