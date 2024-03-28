 "use client"
import { ModeToggle } from '@/components/theme-toogle'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Camera, FlipHorizontal, MoonIcon, PersonStanding, SunIcon, Video, Volume2 } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { Rings } from 'react-loader-spinner'
import Webcam from 'react-webcam'
import { toast } from 'sonner'
import * as cocossd from '@tensorflow-models/coco-ssd'
import '@tensorflow/tfjs-backend-cpu'
import '@tensorflow/tfjs-backend-webgl'
import { drawOnCanvas } from './utils/draw'
import { DetectedObject, ObjectDetection } from '@tensorflow-models/coco-ssd'

type Props = {}
let interval:any  = null;
let stopTimeout:any = null;

const HomePage = (props: Props) => {
  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // state
  const [mirrored, setMirrored] = useState<boolean>(false)
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [autoRecordEnable, setAutoRecordEnable] = useState<boolean>(false)
  const [volume, setVolume] = useState<number>(0.6)
  const [model, setModel]=useState<cocossd.ObjectDetection>()
  const [loading, setLoading]=useState<boolean>(false)

  const mediaRecorderRef= useRef<MediaRecorder|null>(null)

  useEffect(() => {
    if(webcamRef && webcamRef.current){
      const stream= (webcamRef.current.video as any).captureStream();
      if(stream){
        mediaRecorderRef.current= new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = (event) => {
          if(event.data.size > 0){
            const blob = new Blob([event.data], {
              type: event.data.type
            })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download=`${format(new Date())}.webm`;
            a.click();
            toast(url)
          }
        }

        mediaRecorderRef.current.onstart=(e)=>{
          setIsRecording(true)
        }
        mediaRecorderRef.current.onstop=(e)=>{
          setIsRecording(false)
        }
      }
    }
  })


  useEffect(() => {
    setLoading(true)
    initModel();

  },[])

  async function initModel() {
    const loaderModel: ObjectDetection = await cocossd.load({
      base: 'mobilenet_v2'
    })
    setModel(loaderModel)
  }

  useEffect(()=>{
    if(model ) setLoading(false)
  },[model])

    async function runPrediction(){
    if(model && webcamRef.current && webcamRef.current.video&&webcamRef.current.video.readyState===4 ){
      const prediction: DetectedObject[] = await model.detect(webcamRef.current.video);

      resizeCanvas(canvasRef, webcamRef);

      drawOnCanvas(mirrored, prediction ,canvasRef.current?.getContext('2d'))
      let isPerson: boolean = false;
    if(prediction.length>0)
      prediction.forEach((prediction)=>{
        isPerson = (prediction.class === 'person')
      })
      if(isPerson && autoRecordEnable) startRecording(true);
    }

  }

  useEffect(()=>{
    interval = setInterval(()=>{
      runPrediction();
    },500)
    return ()=> clearInterval(interval)
  },[webcamRef.current, model, mirrored, autoRecordEnable])

  // handler
  function userPromptRecord(){
    if(!webcamRef.current){
      toast('Camera is off. Please refresh')
    }

    if(mediaRecorderRef.current?.state == 'recording'){
      mediaRecorderRef.current.requestData();
      clearTimeout(stopTimeout);
      mediaRecorderRef.current.stop();
      toast('Recording saved to download')
    }else{
      startRecording(false);
    }
  }

  function startRecording(isAuto: boolean){
    if(webcamRef.current && mediaRecorderRef.current?.state!='recording'){
      mediaRecorderRef.current?.start();

      stopTimeout=setTimeout(()=>{
        if(mediaRecorderRef.current?.state==='recording'){
          mediaRecorderRef.current.requestData();
          mediaRecorderRef.current.stop();
        }
      },30000)
      toast('Recording...')
    }
  }

  function format(d: Date){
     const formatDate = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}-${d.getSeconds()}`
     return formatDate;
  }

  function userPromptScreenShot(){
    // take picture
   if(!webcamRef.current){
      toast('Camera not found. Please refresh');
    }else{
      const imgSrc = webcamRef.current.getScreenshot();
      const blob = base64toBlob(imgSrc);

      if(!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${format(new Date())}.png`
      a.click();
    }

  }

  function base64toBlob(base64Data: string|null) {
    if(!base64Data) return null;
    const byteCharacters = atob(base64Data.split(",")[1]);
  const arrayBuffer = new ArrayBuffer(byteCharacters.length);
  const byteArray = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }

  return new Blob([arrayBuffer], { type: "image/png" });
  }
  function toogleAutoRecord(){
    if(autoRecordEnable){
      toast('Auto record is off')
      setAutoRecordEnable(false)
    }else{
      toast('Auto record is on')
      setAutoRecordEnable(true)
    }
  }


  return (
    <div className='flex h-screen'>
      <div className='relative'>
        <div className='relative h-screen w-full'>
          <Webcam ref={webcamRef} mirrored={mirrored} className='h-full w-full object-contain p-2'/>
            <canvas ref={canvasRef} className='absolute top-0 left-0 object-contain w-full'>
            </canvas>
        </div>
      </div >
      <div className='flex flex-row flex-1'>
        <div className='border-primary/5 border-2 max-w-xs flex flex-col gap-2 justify-between shadow-md rounded-md p-4'>
          {/* Top */}
          <div className='flex flex-col gap-2'>
            <ModeToggle />

            <Button variant='outline' size={'icon'}
              onClick={() => setMirrored(!mirrored)}
            >
              <FlipHorizontal/>
            </Button>

            <Separator className='my-2'/>

          </div>
          {/* Mid */}
          <div className='flex flex-col gap-2'>
            <Separator/>
            <Button variant={'outline'} size={'icon'} onClick={userPromptScreenShot}><Camera/></Button>
            <Button variant={isRecording? 'destructive':'outline'} size={'icon'} onClick={userPromptRecord}>
              <Video/>
            </Button>
            <Separator className='my-2'/>
            <Button variant={autoRecordEnable? 'destructive':'outline'} size={'icon'} onClick={toogleAutoRecord}>
              {autoRecordEnable ? <Rings/>: <PersonStanding/>}
            </Button>
          </div>
          {/* Bot */}
          <div className='flex flex-col gap-2'>
            <Separator className='my-2'/>
            <Popover>
              <PopoverTrigger>
                <Button variant={'outline'} size={'icon'}>
                  <Volume2/>
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Slider max={1} min={0} step={0.2} defaultValue={[volume]} onValueCommit={(val)=>{
                  setVolume(val[0])
                }} >

                </Slider>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className='h-full flex-1 py-4 px-2 overflow-y-scroll'>
                <RenderFeatureHighlightsSection/>
        </div>
      </div>
      {loading && <div className='z-50 absolute w-full h-full flex items-center justify-center bg-primary-foreground'>
                Getting things ready... <Rings height={50} color='red' />
        </div>}
    </div>
  )

  function RenderFeatureHighlightsSection() {
    return <div className="text-xs text-muted-foreground">
      <ul className="space-y-4">
        <li>
          <strong>Dark Mode/Sys Theme 🌗</strong>
          <p>Toggle between dark mode and system theme.</p>
          {/* <Button className="my-2 h-6 w-6" variant={"outline"} size={"icon"}>
            <SunIcon size={14} />
          </Button>{" "} */}
          /{" "}
          {/* <Button className="my-2 h-6 w-6" variant={"outline"} size={"icon"}>
            <MoonIcon size={14} />
          </Button> */}
        </li>
        <li>
          <strong>Horizontal Flip ↔️</strong>
          <p>Adjust horizontal orientation.</p>
          {/* <Button className='h-6 w-6 my-2'
            variant={'outline'} size={'icon'}
            onClick={() => {
              setMirrored((prev) => !prev)
            }}
          ><FlipHorizontal size={14} /></Button> */}
        </li>
        <Separator />
        <li>
          <strong>Take Pictures 📸</strong>
          <p>Capture snapshots at any moment from the video feed.</p>
          {/* <Button
            className='h-6 w-6 my-2'
            variant={'outline'} size={'icon'}
            onClick={userPromptScreenShot}
          >
            <Camera size={14} />
          </Button> */}
        </li>
        <li>
          <strong>Manual Video Recording 📽️</strong>
          <p>Manually record video clips as needed.</p>
          {/* <Button className='h-6 w-6 my-2'
            variant={isRecording ? 'destructive' : 'outline'} size={'icon'}
            onClick={userPromptRecord}
          >
            <Video size={14} />
          </Button> */}
        </li>
        <Separator />
        <li>
          <strong>Enable/Disable Auto Record 🚫</strong>
          <p>
            Option to enable/disable automatic video recording whenever
            required.
          </p>
          {/* <Button className='h-6 w-6 my-2'
            variant={autoRecordEnable ? 'destructive' : 'outline'}
            size={'icon'}
            onClick={toogleAutoRecord}
          >
            {autoRecordEnable ? <Rings color='white' height={30} /> : <PersonStanding size={14} />}

          </Button> */}
        </li>

        <li>
          <strong>Volume Slider 🔊</strong>
          <p>Adjust the volume level of the notifications.</p>
        </li>
         <li>
          <strong>Camera Feed Highlighting 🎨</strong>
          <p>
            Highlights persons in{" "}
            <span style={{ color: "#FF0F0F" }}>red</span> and other objects in{" "}
            <span style={{ color: "#00B612" }}>green</span>.
          </p>
        </li>
        <Separator />
        <li className="space-y-4">
          <strong>Share your thoughts 💬 </strong>
          <br />
          <br />
          <br />
        </li>
      </ul>
    </div>
  }
}


export default HomePage;

function resizeCanvas(canvasRef: React.RefObject<HTMLCanvasElement>, webcamRef: React.RefObject<Webcam>) {
  const canvas = canvasRef.current;
  const video =webcamRef.current?.video;
  if((canvas && video)){
    const {videoWidth, videoHeight}= video;
    canvas.width=videoWidth;
    canvas.height= videoHeight;
  }
}
