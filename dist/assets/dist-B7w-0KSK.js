import{c as e,f as t}from"./index-DYiJg8n3.js";var n=t(e()),r=e=>e.replace(/([a-z0-9])([A-Z])/g,`$1-$2`).toLowerCase(),i=(...e)=>e.filter((e,t,n)=>!!e&&e.trim()!==``&&n.indexOf(e)===t).join(` `).trim(),a={xmlns:`http://www.w3.org/2000/svg`,width:24,height:24,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,strokeWidth:2,strokeLinecap:`round`,strokeLinejoin:`round`},o=(0,n.forwardRef)(({color:e=`currentColor`,size:t=24,strokeWidth:r=2,absoluteStrokeWidth:o,className:s=``,children:c,iconNode:l,...u},d)=>(0,n.createElement)(`svg`,{ref:d,...a,width:t,height:t,stroke:e,strokeWidth:o?Number(r)*24/Number(t):r,className:i(`lucide`,s),...u},[...l.map(([e,t])=>(0,n.createElement)(e,t)),...Array.isArray(c)?c:[c]])),s=(e,t)=>{let a=(0,n.forwardRef)(({className:a,...s},c)=>(0,n.createElement)(o,{ref:c,iconNode:t,className:i(`lucide-${r(e)}`,a),...s}));return a.displayName=`${e}`,a},c={data:``},l=e=>{if(typeof window==`object`){let t=(e?e.querySelector(`#_goober`):window._goober)||Object.assign(document.createElement(`style`),{innerHTML:` `,id:`_goober`});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||c},u=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,d=/\/\*[^]*?\*\/|  +/g,f=/\n+/g,p=(e,t)=>{let n=``,r=``,i=``;for(let a in e){let o=e[a];a[0]==`@`?a[1]==`i`?n=a+` `+o+`;`:r+=a[1]==`f`?p(o,a):a+`{`+p(o,a[1]==`k`?``:t)+`}`:typeof o==`object`?r+=p(o,t?t.replace(/([^,])+/g,e=>a.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,t=>/&/.test(t)?t.replace(/&/g,e):e?e+` `+t:t)):a):o!=null&&(a=a[1]==`-`?a:a.replace(/[A-Z]/g,`-$&`).toLowerCase(),i+=p.p?p.p(a,o):a+`:`+o+`;`)}return n+(t&&i?t+`{`+i+`}`:i)+r},m={},h=e=>{if(typeof e==`object`){let t=``;for(let n in e)t+=n+h(e[n]);return t}return e},g=(e,t,n,r,i)=>{let a=h(e),o=m[a]||(m[a]=(e=>{let t=0,n=11;for(;t<e.length;)n=101*n+e.charCodeAt(t++)>>>0;return`go`+n})(a));if(!m[o]){let t=a===e?(e=>{let t,n,r=[{}];for(;t=u.exec(e.replace(d,``));)t[4]?r.shift():t[3]?(n=t[3].replace(f,` `).trim(),r.unshift(r[0][n]=r[0][n]||{})):r[0][t[1]]=t[2].replace(f,` `).trim();return r[0]})(e):e;m[o]=p(i?{[`@keyframes `+o]:t}:t,n?``:`.`+o)}let s=n&&m.g;return n&&(m.g=m[o]),((e,t,n,r)=>{r?t.data=t.data.replace(r,e):t.data.indexOf(e)===-1&&(t.data=n?e+t.data:t.data+e)})(m[o],t,r,s),o},_=(e,t,n)=>e.reduce((e,r,i)=>{let a=t[i];if(a&&a.call){let e=a(n),t=e&&e.props&&e.props.className||/^go/.test(e)&&e;a=t?`.`+t:e&&typeof e==`object`?e.props?``:p(e,``):!1===e?``:e}return e+r+(a??``)},``);function v(e){let t=this||{},n=e.call?e(t.p):e;return g(n.unshift?n.raw?_(n,[].slice.call(arguments,1),t.p):n.reduce((e,n)=>Object.assign(e,n&&n.call?n(t.p):n),{}):n,l(t.target),t.g,t.o,t.k)}var y,b,x;v.bind({g:1});var S=v.bind({k:1});function ee(e,t,n,r){p.p=t,y=e,b=n,x=r}function C(e,t){let n=this||{};return function(){let r=arguments;function i(a,o){let s=Object.assign({},a),c=s.className||i.className;n.p=Object.assign({theme:b&&b()},s),n.o=/go\d/.test(c),s.className=v.apply(n,r)+(c?` `+c:``),t&&(s.ref=o);let l=e;return e[0]&&(l=s.as||e,delete s.as),x&&l[0]&&x(s),y(l,s)}return t?t(i):i}}var w=e=>typeof e==`function`,T=(e,t)=>w(e)?e(t):e,te=(()=>{let e=0;return()=>(++e).toString()})(),E=(()=>{let e;return()=>{if(e===void 0&&typeof window<`u`){let t=matchMedia(`(prefers-reduced-motion: reduce)`);e=!t||t.matches}return e}})(),D=20,O=`default`,k=(e,t)=>{let{toastLimit:n}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,n)};case 1:return{...e,toasts:e.toasts.map(e=>e.id===t.toast.id?{...e,...t.toast}:e)};case 2:let{toast:r}=t;return k(e,{type:+!!e.toasts.find(e=>e.id===r.id),toast:r});case 3:let{toastId:i}=t;return{...e,toasts:e.toasts.map(e=>e.id===i||i===void 0?{...e,dismissed:!0,visible:!1}:e)};case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(e=>e.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let a=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(e=>({...e,pauseDuration:e.pauseDuration+a}))}}},A=[],j={toasts:[],pausedAt:void 0,settings:{toastLimit:D}},M={},N=(e,t=O)=>{M[t]=k(M[t]||j,e),A.forEach(([e,n])=>{e===t&&n(M[t])})},P=e=>Object.keys(M).forEach(t=>N(e,t)),F=e=>Object.keys(M).find(t=>M[t].toasts.some(t=>t.id===e)),I=(e=O)=>t=>{N(t,e)},L={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},R=(e={},t=O)=>{let[r,i]=(0,n.useState)(M[t]||j),a=(0,n.useRef)(M[t]);(0,n.useEffect)(()=>(a.current!==M[t]&&i(M[t]),A.push([t,i]),()=>{let e=A.findIndex(([e])=>e===t);e>-1&&A.splice(e,1)}),[t]);let o=r.toasts.map(t=>({...e,...e[t.type],...t,removeDelay:t.removeDelay||e[t.type]?.removeDelay||e?.removeDelay,duration:t.duration||e[t.type]?.duration||e?.duration||L[t.type],style:{...e.style,...e[t.type]?.style,...t.style}}));return{...r,toasts:o}},z=(e,t=`blank`,n)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:`status`,"aria-live":`polite`},message:e,pauseDuration:0,...n,id:n?.id||te()}),B=e=>(t,n)=>{let r=z(t,e,n);return I(r.toasterId||F(r.id))({type:2,toast:r}),r.id},V=(e,t)=>B(`blank`)(e,t);V.error=B(`error`),V.success=B(`success`),V.loading=B(`loading`),V.custom=B(`custom`),V.dismiss=(e,t)=>{let n={type:3,toastId:e};t?I(t)(n):P(n)},V.dismissAll=e=>V.dismiss(void 0,e),V.remove=(e,t)=>{let n={type:4,toastId:e};t?I(t)(n):P(n)},V.removeAll=e=>V.remove(void 0,e),V.promise=(e,t,n)=>{let r=V.loading(t.loading,{...n,...n?.loading});return typeof e==`function`&&(e=e()),e.then(e=>{let i=t.success?T(t.success,e):void 0;return i?V.success(i,{id:r,...n,...n?.success}):V.dismiss(r),e}).catch(e=>{let i=t.error?T(t.error,e):void 0;i?V.error(i,{id:r,...n,...n?.error}):V.dismiss(r)}),e};var H=1e3,U=(e,t=`default`)=>{let{toasts:r,pausedAt:i}=R(e,t),a=(0,n.useRef)(new Map).current,o=(0,n.useCallback)((e,t=H)=>{if(a.has(e))return;let n=setTimeout(()=>{a.delete(e),s({type:4,toastId:e})},t);a.set(e,n)},[]);(0,n.useEffect)(()=>{if(i)return;let e=Date.now(),n=r.map(n=>{if(n.duration===1/0)return;let r=(n.duration||0)+n.pauseDuration-(e-n.createdAt);if(r<0){n.visible&&V.dismiss(n.id);return}return setTimeout(()=>V.dismiss(n.id,t),r)});return()=>{n.forEach(e=>e&&clearTimeout(e))}},[r,i,t]);let s=(0,n.useCallback)(I(t),[t]),c=(0,n.useCallback)(()=>{s({type:5,time:Date.now()})},[s]),l=(0,n.useCallback)((e,t)=>{s({type:1,toast:{id:e,height:t}})},[s]),u=(0,n.useCallback)(()=>{i&&s({type:6,time:Date.now()})},[i,s]),d=(0,n.useCallback)((e,t)=>{let{reverseOrder:n=!1,gutter:i=8,defaultPosition:a}=t||{},o=r.filter(t=>(t.position||a)===(e.position||a)&&t.height),s=o.findIndex(t=>t.id===e.id),c=o.filter((e,t)=>t<s&&e.visible).length;return o.filter(e=>e.visible).slice(...n?[c+1]:[0,c]).reduce((e,t)=>e+(t.height||0)+i,0)},[r]);return(0,n.useEffect)(()=>{r.forEach(e=>{if(e.dismissed)o(e.id,e.removeDelay);else{let t=a.get(e.id);t&&(clearTimeout(t),a.delete(e.id))}})},[r,o]),{toasts:r,handlers:{updateHeight:l,startPause:c,endPause:u,calculateOffset:d}}},W=S`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,G=S`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,K=S`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,q=C(`div`)`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||`#ff4b4b`};
  position: relative;
  transform: rotate(45deg);

  animation: ${W} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${G} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||`#fff`};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${K} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,J=S`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,Y=C(`div`)`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||`#e0e0e0`};
  border-right-color: ${e=>e.primary||`#616161`};
  animation: ${J} 1s linear infinite;
`,ne=S`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,X=S`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,Z=C(`div`)`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||`#61d345`};
  position: relative;
  transform: rotate(45deg);

  animation: ${ne} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${X} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||`#fff`};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,re=C(`div`)`
  position: absolute;
`,ie=C(`div`)`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,ae=S`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,oe=C(`div`)`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${ae} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,se=({toast:e})=>{let{icon:t,type:r,iconTheme:i}=e;return t===void 0?r===`blank`?null:n.createElement(ie,null,n.createElement(Y,{...i}),r!==`loading`&&n.createElement(re,null,r===`error`?n.createElement(q,{...i}):n.createElement(Z,{...i}))):typeof t==`string`?n.createElement(oe,null,t):t},ce=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,le=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,ue=`0%{opacity:0;} 100%{opacity:1;}`,Q=`0%{opacity:1;} 100%{opacity:0;}`,de=C(`div`)`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,fe=C(`div`)`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,pe=(e,t)=>{let n=e.includes(`top`)?1:-1,[r,i]=E()?[ue,Q]:[ce(n),le(n)];return{animation:t?`${S(r)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${S(i)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},me=n.memo(({toast:e,position:t,style:r,children:i})=>{let a=e.height?pe(e.position||t||`top-center`,e.visible):{opacity:0},o=n.createElement(se,{toast:e}),s=n.createElement(fe,{...e.ariaProps},T(e.message,e));return n.createElement(de,{className:e.className,style:{...a,...r,...e.style}},typeof i==`function`?i({icon:o,message:s}):n.createElement(n.Fragment,null,o,s))});ee(n.createElement);var he=({id:e,className:t,style:r,onHeightUpdate:i,children:a})=>{let o=n.useCallback(t=>{if(t){let n=()=>{let n=t.getBoundingClientRect().height;i(e,n)};n(),new MutationObserver(n).observe(t,{subtree:!0,childList:!0,characterData:!0})}},[e,i]);return n.createElement(`div`,{ref:o,className:t,style:r},a)},ge=(e,t)=>{let n=e.includes(`top`),r=n?{top:0}:{bottom:0},i=e.includes(`center`)?{justifyContent:`center`}:e.includes(`right`)?{justifyContent:`flex-end`}:{};return{left:0,right:0,display:`flex`,position:`absolute`,transition:E()?void 0:`all 230ms cubic-bezier(.21,1.02,.73,1)`,transform:`translateY(${t*(n?1:-1)}px)`,...r,...i}},_e=v`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,$=16,ve=({reverseOrder:e,position:t=`top-center`,toastOptions:r,gutter:i,children:a,toasterId:o,containerStyle:s,containerClassName:c})=>{let{toasts:l,handlers:u}=U(r,o);return n.createElement(`div`,{"data-rht-toaster":o||``,style:{position:`fixed`,zIndex:9999,top:$,left:$,right:$,bottom:$,pointerEvents:`none`,...s},className:c,onMouseEnter:u.startPause,onMouseLeave:u.endPause},l.map(r=>{let o=r.position||t,s=ge(o,u.calculateOffset(r,{reverseOrder:e,gutter:i,defaultPosition:t}));return n.createElement(he,{id:r.id,key:r.id,onHeightUpdate:u.updateHeight,className:r.visible?_e:``,style:s},r.type===`custom`?T(r.message,r):a?a(r):n.createElement(me,{toast:r,position:o}))}))},ye=V;export{ye as n,s as r,ve as t};