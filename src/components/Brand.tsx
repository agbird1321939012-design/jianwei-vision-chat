export function BrandMark({className=''}:{className?:string}) {
 return <svg className={className} width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M10 4H6a2 2 0 0 0-2 2v4m14-6h4a2 2 0 0 1 2 2v4M4 18v4a2 2 0 0 0 2 2h4m14-6v4a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="m14 8 1.8 4.2L20 14l-4.2 1.8L14 20l-1.8-4.2L8 14l4.2-1.8L14 8Z" fill="currentColor"/></svg>;
}
export function Brand(){return <div className="brand"><span className="brand-icon"><BrandMark/></span><div><strong>见微<span className="brand-latin">VISTA</span></strong><span className="brand-sub">你的 AI 视觉空间</span></div></div>;}
