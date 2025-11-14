import { useClient } from "@revolt/client";
import { CONFIGURATION } from "@revolt/common";
import { useState } from "@revolt/state";
import { Dialog } from "@revolt/ui";
import { useParams } from "@solidjs/router";
import { createEffect, createMemo, createSignal } from "solid-js";
import { File as StoatFile } from "stoat.js";
import { Flex } from "styled-system/jsx/flex";

export default function Body(props: { file: { file: File } }) {
  let canvasRef;
  let fileInputRef;
  let targetElementRef;

  const [isDrawing, setIsDrawing] = createSignal(false);
  const [context, setContext] = createSignal(null);
  const [backgroundImage, setBackgroundImage] = createSignal(null);
  const [canvasSize, setCanvasSize] = createSignal({ width: 800, height: 600 });
  const [brushColor, setBrushColor] = createSignal("#00FFAA");
  const [brushSize, setBrushSize] = createSignal(3);
  const [shouldShow, setShouldShow] = createSignal(false);
  const [points, setPoints] = createSignal([]);
  const [smoothDrawing, setSmoothDrawing] = createSignal(true);
  const [gif, setGif] = createSignal(null);
  const [hasDrawn, setHasDrawn] = createSignal(false);
  const client = useClient();
  const state = useState();
  const params = useParams();
  const channel = createMemo(() => client()!.channels.get(params.channel)!);

  let lastPoint = null;

  const colors = [
    "black",
    "red",
    "blue",
    "tan",
    "gray",
    "white",
    "green",
    "yellow",
    "purple",
    "orange",
    "pink",
    "cyan",
  ];

  createEffect(() => {
    const canvas = canvasRef;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", {
      willReadFrequently: false,
      alpha: true,
    });
    if (!ctx) return;

    setContext(ctx);
    ctx.lineWidth = brushSize();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = brushColor();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (!hasDrawn() && props.file?.file) {
      // for some reason this gets recalled when changing colors
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.naturalWidth;
          let height = img.naturalHeight;
          const maxWidth = 1980;
          const maxHeight = 1080;
          const scale = Math.min(maxWidth / width, maxHeight / height, 1);
          width = Math.floor(width * scale);
          height = Math.floor(height * scale);

          setCanvasSize({ width, height });
          canvas.width = width;
          canvas.height = height;
          setBackgroundImage(img);
          ctx.drawImage(img, 0, 0, width, height);

          ctx.lineWidth = brushSize();
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = brushColor();
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(props.file.file);
    } else {
      /*canvas.width = canvasSize().width;
      canvas.height = canvasSize().height;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = brushSize();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = brushColor();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';*/
    }
  });

  createEffect(() => {
    const ctx = canvasRef?.getContext("2d");
    if (ctx) {
      ctx.lineWidth = brushSize();
      ctx.strokeStyle = brushColor();
    }
  });

  const getMousePos = (e) => {
    const canvas = canvasRef;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = context();
    if (ctx) {
      const pos = getMousePos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      lastPoint = pos;
      setPoints([pos]);
      setHasDrawn(true);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawing() || !context()) return;
    e.preventDefault();

    const ctx = context();
    const pos = getMousePos(e);

    if (smoothDrawing() && lastPoint) {
      const midPoint = {
        x: (lastPoint.x + pos.x) / 2,
        y: (lastPoint.y + pos.y) / 2,
      };
      ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midPoint.x, midPoint.y);
      ctx.stroke();
      lastPoint = pos;
    } else if (lastPoint) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPoint = pos;
    }

    setPoints((prev) => [...prev, pos]);
  };

  // Throttled pointer move handler
  let lastTime = 0;
  const throttleMs = 16; // ~60fps
  const throttledHandlePointerMove = (e) => {
    const now = Date.now();
    if (now - lastTime >= throttleMs) {
      lastTime = now;
      handlePointerMove(e);
    }
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    if (isDrawing() && context() && points().length > 0) {
      const pos = getMousePos(e);
      const ctx = context();
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    setIsDrawing(false);
    lastPoint = null;
    setPoints([]);
    const ctx = context();
    if (ctx) {
      ctx.closePath();
    }
  };

  const handlePointerLeave = (e) => {
    if (isDrawing()) {
      handlePointerUp(e);
    }
  };

  const handleUploadClick = async () => {
    const canvas = canvasRef;

    if (!canvas) {
      return;
    }

    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => {
        resolve(b);
      }, props.file.file.type || 'image/png');
    });

    if (!blob) {
      console.error("NO BLOB CREATED");
      return;
    }

    const file = new File(
      [blob],
      props.file.file.name || 'edited-image.png',
      { type: blob.type }
    );

    const result = state.draft.addFile(channel().id, file);
  };

  return (
    <Dialog {...props} minWidth={1000}>
      <Flex class="color-palette">
        {colors.map((color) => (
          <div
            class="color-swatch"
            style={{ "background-color": color, width: "20px", height: "20px" }}
            onClick={() => setBrushColor(color)}
          />
        ))}
      </Flex>
      <span>{brushSize()}px</span>

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={throttledHandlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{
          "touch-action": "none",
          cursor: "crosshair",
        }}
      />

      <button onClick={handleUploadClick}>Upload</button>
    </Dialog>
  );
}
