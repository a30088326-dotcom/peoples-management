import { useEffect, useState, type ReactNode, type ImgHTMLAttributes } from 'react';
import { api } from '../lib/api/client';

export function protectedFilePath(value:string) {
  const pathname=new URL(value,'http://local.invalid').pathname;
  const prefix=['/uploads/','/api/files/'].find(p=>pathname.startsWith(p));
  if(!prefix)throw new Error('This file needs to be restored to the document store.');
  const filename=decodeURIComponent(pathname.slice(prefix.length));
  if(!filename || /[\\/\x00]/.test(filename) || filename==='.' || filename==='..')throw new Error('Invalid file link.');
  return '/api/files/'+encodeURIComponent(filename);
}
async function fileBlob(value:string) {
  const response=await api.get(protectedFilePath(value),{responseType:'blob'});
  const safe=/^(application\/pdf|image\/(png|jpeg))$/i.test(response.data.type);
  const blob=safe?response.data:new Blob([response.data],{type:'application/octet-stream'});
  return {url:URL.createObjectURL(blob),previewable:safe};
}
export function useProtectedFile(value?:string) {
  const [state,setState]=useState({source:'',url:'',error:''});
  useEffect(()=>{
    let active=true,url='';
    if(!value){setState({source:'',url:'',error:''});return;}
    setState({source:value,url:'',error:''});
    fileBlob(value).then(result=>{url=result.url;if(!result.previewable){URL.revokeObjectURL(url);if(active)setState({source:value,url:'',error:'Use View Full to download this file type.'});return;}if(active)setState({source:value,url:result.url,error:''});else URL.revokeObjectURL(result.url);})
      .catch(()=>{if(active)setState({source:value,url:'',error:'Unable to open this file. Check your access or restore the file from backup.'});});
    return()=>{active=false;if(url)URL.revokeObjectURL(url);};
  },[value]);
  return state.source===value?state:{source:value||'',url:'',error:''};
}
export function ProtectedImage({src,alt='',className,...props}:ImgHTMLAttributes<HTMLImageElement>) {
  const stored=typeof src==='string'&&/^(?:https?:\/\/[^/]+)?\/(?:api\/files|uploads)\//.test(src);
  const file=useProtectedFile(stored?src:undefined);
  const url=stored?file.url:src;
  if(!url)return <span role="img" aria-label={alt||'Profile image'} className={className}>{(alt||'User').charAt(0).toUpperCase()}</span>;
  return <img {...props} src={url} alt={alt} className={className}/>;
}
export function ProtectedFileLink({value,children,className,title}:{value:string;children:ReactNode;className?:string;title?:string}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const open=async()=>{
    if(busy)return;
    // Open synchronously from the click so browser popup blocking does not hide the file.
    const viewer=window.open('about:blank','_blank');
    if(viewer)viewer.opener=null;
    setBusy(true);setError('');
    try{const {url,previewable}=await fileBlob(value);if(viewer&&previewable)viewer.location.replace(url);else{viewer?.close();const link=document.createElement('a');link.href=url;link.download=decodeURIComponent(protectedFilePath(value).split('/').pop()||'document');link.click();}setTimeout(()=>URL.revokeObjectURL(url),60000);}
    catch{viewer?.close();setError('Unable to open this file. Check your access or restore the file from backup.');}
    finally{setBusy(false);}
  };
  return <span><button type="button" onClick={open} disabled={busy} className={`app-action ${className || ''}`} title={title}>{busy?'Opening…':children}</button>{error&&<span role="alert" className="mt-1 block text-xs text-red-600">{error}</span>}</span>;
}
