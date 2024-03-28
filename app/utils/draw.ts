import { DetectedObject, ObjectDetection } from "@tensorflow-models/coco-ssd"

// mirrored, prediction,canvasRef.current?.getContext('2d')
export function drawOnCanvas(   
     mirrored:boolean,
    prediction: DetectedObject[],
    ctx: CanvasRenderingContext2D | null | undefined
    ){

    prediction.forEach((detectedObject: DetectedObject)=>{
        const {class:name, bbox, score} = detectedObject;
        const [x, y, width, height] = bbox;

        if(ctx){
            ctx.beginPath();
            // style
            ctx.font = "12px Arial";	
            ctx.fillStyle= name === "person" ? "#FF0F0F" : "00B612";
            
            ctx.globalAlpha = 0.4;
            mirrored?ctx.roundRect(ctx.canvas.width-x, y, -width, height,8):ctx.roundRect(x,y,width, height,8);

            ctx.fill();
            ctx.font="12px Courier New";
            ctx.fillStyle="green"
            ctx.globalAlpha=1;
            ctx.fillText(name, x, y);
        }
    })
}