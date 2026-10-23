import {useEffect,useRef,useState,type KeyboardEvent} from 'react';
import {ImagePlus,Camera,BookMarked,ArrowUp,Square,X,LoaderCircle} from 'lucide-react';
import type {ImageAttachment} from '../types';
import {prepareImage} from '../lib/images';
export function Composer({draft,setDraft,images,setImages,onSend,onPrompts,busy,onStop,imageSize,onError}:{draft:string;setDraft:(value:string)=>void;images:ImageAttachment[];setImages:(value:ImageAttachment[]|((old:ImageAttachment[])=>ImageAttachment[]))=>void;onSend:()=>void;onPrompts:()=>void;busy:boolean;onStop:()=>void;imageSize:number;onError:(text:string)=>void}) {
 const textarea=useRef<HTMLTextAreaElement>(null);const picker=useRef<HTMLInputElement>(null);const camera=useRef<HTMLInputElement>(null);const [processing,setProcessing]=useState(false);const [dragging,setDragging]=useState(false);
 const processingRef=useRef(false);const composing=useRef(false);
 useEffect(()=>{const el=textarea.current;if(el){el.style.height='auto';el.style.height=`${Math.min(el.scrollHeight,150)}px`;}},[draft]);
 async function add(files:FileList|File[]) {
  if(processingRef.current||busy)return;const incoming=Array.from(files);if(!incoming.length)return;
  if(incoming.length+images.length>6){onError('每条消息最多上传 6 张图片');return;}
  processingRef.current=true;setProcessing(true);
  const prepared:ImageAttachment[]=[];
  for(const file of incoming){try{prepared.push(await prepareImage(file,imageSize));}catch(e){onError(e instanceof Error?e.message:'读取图片失败');}}
  setImages(old=>[...old,...prepared].slice(0,6));setProcessing(false);processingRef.current=false;
 }
 const key=(e:KeyboardEvent<HTMLTextAreaElement>)=>{
  if(e.key!=='Enter'||e.nativeEvent.isComposing||composing.current)return;
  const mobile=matchMedia('(pointer: coarse)').matches;
  if((e.ctrlKey||e.metaKey)||(!mobile&&!e.shiftKey)){e.preventDefault();if(!busy&&!processing)onSend();}
 };
 return <div className="composer-region"><div className={`composer ${dragging?'dragging':''}`} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);void add(e.dataTransfer.files);}}>{images.length?<div className="attachment-strip">{images.map(image=><div className="attachment" key={image.id}><img src={image.dataUrl} alt={image.name}/><button aria-label={`移除图片 ${image.name}`} onClick={()=>setImages(old=>old.filter(i=>i.id!==image.id))}><X size={13}/></button><span>{image.width} × {image.height}</span></div>)}</div>:null}<textarea ref={textarea} aria-label="消息" placeholder="写下你的问题，或添加一张图片…" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={key} onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} onPaste={e=>{const files=Array.from(e.clipboardData.files).filter(f=>f.type.startsWith('image/'));if(files.length){e.preventDefault();void add(files);}}} rows={2} maxLength={30000}/><div className="composer-toolbar"><div className="composer-tools"><button className="tool-button" onClick={()=>picker.current?.click()} disabled={processing||busy} aria-label="添加图片" title="添加图片">{processing?<LoaderCircle className="spin" size={19}/>:<ImagePlus size={19}/>}<span>图片</span></button><button className="icon-button" onClick={()=>camera.current?.click()} disabled={processing||busy} aria-label="拍照" title="拍照"><Camera size={19}/></button><span className="tool-divider"/><button className="tool-button" onClick={onPrompts} aria-label="调用提示词" title="调用提示词"><BookMarked size={18}/><span>提示词</span></button></div>{busy?<button className="send-button stop-button" aria-label="停止生成" title="停止生成" onClick={onStop}><Square size={17} fill="currentColor"/></button>:<button className="send-button" aria-label="发送消息" title="发送消息" onClick={onSend} disabled={processing||(!draft.trim()&&!images.length)}><ArrowUp size={21}/></button>}</div><input className="visually-hidden" ref={picker} type="file" accept="image/*" multiple aria-label="选择图片文件" onChange={e=>{if(e.target.files)void add(e.target.files);e.target.value='';}}/><input className="visually-hidden" ref={camera} type="file" accept="image/*" capture="environment" aria-label="拍摄图片文件" onChange={e=>{if(e.target.files)void add(e.target.files);e.target.value='';}}/></div><div className="composer-caption"><span>内容仅发送至你配置的 API</span><span className="desktop-only">Enter 发送 · Shift + Enter 换行</span><span className="mobile-only">图片与文字，一起发送</span></div></div>;
}
