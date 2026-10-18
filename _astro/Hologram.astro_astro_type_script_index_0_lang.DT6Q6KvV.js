const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["_astro/GLTFLoader.CZOysvRI.js","_astro/three.module.pRDCS9Zk.js"])))=>i.map(i=>d[i]);
var e=(function(){let e=typeof document<`u`&&document.createElement(`link`).relList;return e&&e.supports&&e.supports(`modulepreload`)?`modulepreload`:`preload`})(),t=function(e){return`/`+e},n={},r=function(e){return e.pathname.endsWith(`.css`)},i=function(i,a,o){let s=Promise.resolve();if(a&&a.length>0){let i,c=document.querySelector(`meta[property=csp-nonce]`),l=c?.nonce||c?.getAttribute(`nonce`);function u(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}function d(e){return import.meta.resolve?new URL(import.meta.resolve(e)):new URL(e,import.meta.url)}s=u(a.map(a=>{a=t(a,o);let s=d(a);if(s.href in n)return;n[s.href]=!0;let c=r(s);if(i===void 0){i={all:new Set,styles:new Set};let e=document.getElementsByTagName(`link`);for(let t=e.length-1;t>=0;t--){let n=e[t];i.all.add(n.href),n.rel===`stylesheet`&&i.styles.add(n.href)}}if((c?i.styles:i.all).has(s.href))return;let u=document.createElement(`link`);if(u.rel=c?`stylesheet`:e,c||(u.as=`script`),u.crossOrigin=``,u.href=s.href,l&&u.setAttribute(`nonce`,l),document.head.appendChild(u),c)return new Promise((e,t)=>{u.addEventListener(`load`,e),u.addEventListener(`error`,()=>t(Error(`Unable to preload CSS for ${s}`)))})}).filter(e=>e!==void 0))}function c(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return s.then(e=>{for(let t of e||[])t.status===`rejected`&&c(t.reason);return i().catch(c)})},a=null;function o(){let e=document.getElementById(`holo-anchor`),t=document.getElementById(`story`);if(!e||!t)return null;let n=new AbortController,{signal:r}=n,i=!1,a=!1,o;function c(){i||!a||document.hidden||r.aborted||(i=!0,o?.disconnect(),s(e,t,r).catch(e=>{if(r.aborted)return;console.error(`Hologram initialization failed:`,e);let t=document.getElementById(`holo-loading`);t&&(t.textContent=`Hologram unavailable`)}))}return`IntersectionObserver`in window?(o=new IntersectionObserver(([e])=>{a=e.isIntersecting,c()},{rootMargin:`250px`}),o.observe(e)):(a=!0,c()),document.addEventListener(`visibilitychange`,c,{signal:r}),window.addEventListener(`pagehide`,e=>{e.persisted||(o?.disconnect(),n.abort())},{signal:r}),()=>{o?.disconnect(),n.abort()}}async function s(e,t,n){let[r,{GLTFLoader:a},{MeshoptDecoder:o}]=await Promise.all([i(()=>import(`./three.module.pRDCS9Zk.js`).then(e=>e.r),[]),i(()=>import(`./GLTFLoader.CZOysvRI.js`),__vite__mapDeps([0,1])),i(()=>import(`./meshopt_decoder.module.DXTYc6wn.js`),[])]);if(n.aborted)return;let s=window.matchMedia(`(prefers-reduced-motion: reduce)`),c=s.matches,l=!1,u=new r.Color(`#22d861`),d;try{d=new r.WebGLRenderer({alpha:!0,antialias:!0})}catch{let e=document.getElementById(`holo-loading`);e&&(e.textContent=`Hologram unavailable`);return}d.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75)),d.setClearColor(0,0),d.domElement.style.cssText=`position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;`,t.appendChild(d.domElement);let f=new r.Scene,p=new r.PerspectiveCamera(38,1,.1,100),m=new r.Group;f.add(m);let h={uTime:{value:0},uColor:{value:u},uSpawn:{value:0},uBeam:{value:0}},g={uTime:h.uTime,uColor:h.uColor,uSpawn:h.uSpawn,uMinY:{value:-.95},uHeight:{value:1.9}},ee=new r.ShaderMaterial({uniforms:g,transparent:!0,blending:r.AdditiveBlending,depthWrite:!1,side:r.DoubleSide,vertexShader:`
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 mv = viewMatrix * worldPos;
        vViewDir = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,fragmentShader:`
      uniform float uTime;
      uniform float uSpawn;
      uniform vec3 uColor;
      uniform float uMinY;
      uniform float uHeight;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;

      float rand(vec2 co) {
        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        vec3 n = normalize(vNormal);
        vec3 v = normalize(vViewDir);
        float fres = pow(1.0 - abs(dot(n, v)), 2.0);

        float ny = clamp((vWorldPos.y - uMinY) / uHeight, 0.0, 1.0);

        float frontier = uSpawn * 1.1;
        float vis = 1.0 - smoothstep(frontier - 0.02, frontier + 0.02, ny);
        float grain = rand(floor(vWorldPos.xz * 90.0) + floor(vWorldPos.y * 90.0));
        vis *= step(grain, frontier * 1.25);
        float edge = smoothstep(frontier - 0.10, frontier, ny) * vis;

        float scan = 0.74 + 0.26 * sin(vWorldPos.y * 55.0 - uTime * 2.0);
        float micro = 0.86 + 0.14 * sin(vWorldPos.y * 420.0);
        float flicker = 0.94 + 0.06 * sin(uTime * 17.0) * sin(uTime * 5.3 + 1.3);

        float instability = (1.0 - uSpawn) * step(0.75, rand(vec2(floor(vWorldPos.y * 140.0), floor(uTime * 22.0)))) * 0.6;

        float row = floor(vWorldPos.y * 24.0);
        float glitch = step(0.985, rand(vec2(row, floor(uTime * 9.0)))) * 0.35;

        float lowerGlow = pow(1.0 - ny, 2.2);

        float alpha = (0.15 + fres * 0.85) * scan * micro;
        alpha = alpha * flicker * (1.0 - instability) + glitch * fres;
        alpha = alpha * vis + edge * 0.9;
        alpha += lowerGlow * 0.18;

        vec3 col = uColor * (0.5 + fres * 1.5)
                 + uColor * lowerGlow * 0.5
                 + vec3(0.55, 1.0, 0.7) * edge * 1.6
                 + vec3(0.4, 1.0, 0.65) * glitch;

        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
      }
    `});function te(e){return new r.ShaderMaterial({uniforms:{uTime:h.uTime,uColor:h.uColor,uBeam:h.uBeam,uStrength:{value:e}},transparent:!0,blending:r.AdditiveBlending,depthWrite:!1,side:r.DoubleSide,vertexShader:`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,fragmentShader:`
        uniform float uTime;
        uniform float uBeam;
        uniform float uStrength;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float fade = pow(1.0 - vUv.y, 1.9);
          float scan = 0.88 + 0.12 * sin(vUv.y * 34.0 - uTime * 2.6);
          float edgeFade = smoothstep(0.0, 0.12, vUv.y);
          gl_FragColor = vec4(uColor, fade * uStrength * scan * edgeFade * uBeam);
        }
      `})}let ne=new r.Mesh(new r.CylinderGeometry(.78,.34,2,40,1,!0),te(.1)),re=new r.Mesh(new r.CylinderGeometry(.6,.22,2,40,1,!0),te(.22)),_=new r.Group;_.add(ne,re),_.position.y=4163336342344337e-32,m.add(_);function ie(){let e=document.createElement(`canvas`);e.width=512,e.height=512;let t=e.getContext(`2d`);t.clearRect(0,0,512,512);let n=512/28;t.font=`16px monospace`;for(let e=0;e<28;e++){let r=Math.floor(Math.random()*30),i=14+Math.floor(Math.random()*10);for(let a=0;a<i;a++){let i=`iZaCsnv01ｱｲｻﾞﾄﾞ<>[]#@$%&0101`[Math.floor(Math.random()*28)];t.fillStyle=Math.random()<.12?`rgba(190,255,215,0.95)`:`rgba(34,216,97,${.25+Math.random()*.55})`,t.fillText(i,e*n+1,(a+r)*n%512)}}let i=new r.CanvasTexture(e);return i.wrapS=r.RepeatWrapping,i.wrapT=r.RepeatWrapping,i.repeat.set(2,1),i}let v={uTime:h.uTime,uCode:{value:0},uMap:{value:ie()}},ae=new r.ShaderMaterial({uniforms:v,transparent:!0,blending:r.AdditiveBlending,depthWrite:!1,side:r.DoubleSide,vertexShader:`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,fragmentShader:`
      uniform sampler2D uMap;
      uniform float uTime;
      uniform float uCode;
      varying vec2 vUv;
      void main() {
        vec2 uv = vec2(vUv.x, vUv.y * 1.4 + uTime * 0.45);
        vec4 t = texture2D(uMap, uv);
        float fade = smoothstep(0.0, 0.15, vUv.y) * pow(1.0 - vUv.y, 0.7);
        gl_FragColor = vec4(t.rgb, t.a * fade * uCode * 0.85);
      }
    `}),y=new r.Mesh(new r.CylinderGeometry(.68,.3,2,40,1,!0),ae);y.position.y=_.position.y,m.add(y);let b=new r.BufferGeometry;{let e=new Float32Array(160),t=new Float32Array(160),n=new Float32Array(160),i=new Float32Array(160),a=new Float32Array(160);for(let r=0;r<160;r++)e[r]=Math.random(),t[r]=Math.random()*Math.PI*2,n[r]=Math.random(),i[r]=.1+Math.random()*.16,a[r]=2+Math.random()*4;b.setAttribute(`position`,new r.BufferAttribute(new Float32Array(480),3)),b.setAttribute(`aSeed`,new r.BufferAttribute(e,1)),b.setAttribute(`aAngle`,new r.BufferAttribute(t,1)),b.setAttribute(`aRadius`,new r.BufferAttribute(n,1)),b.setAttribute(`aSpeed`,new r.BufferAttribute(i,1)),b.setAttribute(`aSize`,new r.BufferAttribute(a,1))}let oe=new r.ShaderMaterial({uniforms:{uTime:h.uTime,uColor:h.uColor,uBeam:h.uBeam},transparent:!0,blending:r.AdditiveBlending,depthWrite:!1,vertexShader:`
      attribute float aSeed;
      attribute float aAngle;
      attribute float aRadius;
      attribute float aSpeed;
      attribute float aSize;
      uniform float uTime;
      varying float vAlpha;
      void main() {
        float t = fract(aSeed + uTime * aSpeed * 0.28);
        float y = t * 2.0;
        float r = mix(0.28, 0.74, t) * aRadius;
        float swirl = aAngle + uTime * 0.35;
        vec3 pos = vec3(cos(swirl) * r, y, sin(swirl) * r);
        vAlpha = (1.0 - t) * 0.85;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = aSize * (140.0 / -mv.z) * 0.02;
        gl_Position = projectionMatrix * mv;
      }
    `,fragmentShader:`
      uniform vec3 uColor;
      uniform float uBeam;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * vAlpha * uBeam;
        gl_FragColor = vec4(uColor * 1.4, a);
      }
    `}),se=new r.Points(b,oe);se.position.y=-1,m.add(se);function ce(e,t){let n=document.createElement(`canvas`);n.width=n.height=256;let i=n.getContext(`2d`),a=i.createRadialGradient(128,128,0,128,128,128);return a.addColorStop(0,e),a.addColorStop(.45,t),a.addColorStop(1,`rgba(34,216,97,0)`),i.fillStyle=a,i.fillRect(0,0,256,256),new r.CanvasTexture(n)}let x=new r.Mesh(new r.CircleGeometry(.82,48),new r.MeshBasicMaterial({map:ce(`rgba(120,255,170,0.5)`,`rgba(34,216,97,0.16)`),transparent:!0,blending:r.AdditiveBlending,depthWrite:!1}));x.rotation.x=-Math.PI/2,x.position.y=-1.12,x.scale.y=.55,m.add(x);let le=new r.ShaderMaterial({uniforms:{uTime:h.uTime,uColor:h.uColor,uBeam:h.uBeam},transparent:!0,blending:r.AdditiveBlending,depthWrite:!1,vertexShader:`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,fragmentShader:`
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uBeam;
      varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float ring = fract(uTime * 0.35);
        float band = smoothstep(ring - 0.06, ring, d) * smoothstep(ring + 0.06, ring, d);
        float a = band * (1.0 - ring) * 0.35 * uBeam;
        gl_FragColor = vec4(uColor, a);
      }
    `}),S=new r.Mesh(new r.CircleGeometry(.82,48),le);S.rotation.x=-Math.PI/2,S.position.y=-1.1190000000000002,S.scale.y=.55,m.add(S);let ue=new r.MeshStandardMaterial({color:1316378,metalness:.85,roughness:.32}),de=new r.MeshStandardMaterial({color:723982,metalness:.9,roughness:.45}),fe=new r.Mesh(new r.CylinderGeometry(.46,.52,.1,56),ue);fe.position.y=-1.07,m.add(fe);let pe=new r.Mesh(new r.CylinderGeometry(.4,.46,.05,56),de);pe.position.y=-.9950000000000001,m.add(pe);let C=new r.Mesh(new r.RingGeometry(.18,.3,48),new r.MeshBasicMaterial({color:2283617,transparent:!0,opacity:0,blending:r.AdditiveBlending,side:r.DoubleSide,depthWrite:!1}));C.rotation.x=-Math.PI/2,C.position.y=-.9680000000000001,m.add(C);let w=new r.Mesh(new r.CircleGeometry(.17,40),new r.MeshBasicMaterial({color:12582877,transparent:!0,opacity:0,blending:r.AdditiveBlending,depthWrite:!1}));w.rotation.x=-Math.PI/2,w.position.y=-.9670000000000001,m.add(w);let T=new r.Mesh(new r.CircleGeometry(.34,40),new r.MeshBasicMaterial({map:ce(`rgba(160,255,200,0.8)`,`rgba(34,216,97,0.25)`),transparent:!0,opacity:0,blending:r.AdditiveBlending,depthWrite:!1}));T.rotation.x=-Math.PI/2,T.position.y=-.9600000000000001,m.add(T),f.add(new r.AmbientLight(3159613,.9));let E=new r.DirectionalLight(14674146,1.4);E.position.set(2.5,3,2.5),f.add(E);let D=new r.PointLight(2283617,0,4);m.add(D),D.position.set(0,-.8200000000000001,0);let O=Math.tan(p.fov*Math.PI/360),k=0;function me(){let n=t.getBoundingClientRect(),r=n.width,i=n.height;if(!r||!i)return;d.setSize(r,i,!1),p.aspect=r/i;let a=(e.clientHeight||i*.5)*1.12,o=e.clientWidth||r*.6,s=2.35*i/(2*O*a),c=1.7*r/(2*O*p.aspect*o),l=Math.max(s,c,2.4);p.position.set(0,0,Math.min(l,40)),p.lookAt(0,0,0),p.updateProjectionMatrix(),p.updateMatrixWorld()}function A(){let n=t.getBoundingClientRect(),i=e.getBoundingClientRect(),a=n.width,o=n.height;if(!a||!o)return;let s=i.left+i.width/2-n.left;p.setViewOffset(a,o,a/2-s,0,a,o);let c=-((i.bottom-n.top)/o*2-1),l=new r.Vector3(0,c,.5).unproject(p).sub(p.position).normalize(),u=-p.position.z/l.z,d=p.position.y+l.y*u;m.position.set(0,d- -1.14,0),m.rotation.y=k}function j(){me(),A(),B||W()}let M=new ResizeObserver(j);M.observe(t),M.observe(e),window.addEventListener(`resize`,j,{signal:n});let N=new a;N.setMeshoptDecoder(o);let P=null,F=0,I=-1,L=0,R=null,z=0,B=!1,V=!0,he=e.getBoundingClientRect(),H=he.bottom>0&&he.top<window.innerHeight,U=()=>!l&&V&&H&&!document.hidden&&!!P,ge=()=>c||document.documentElement.dataset.motionPaused===`true`,_e=()=>U()&&!ge();N.load(`/models/izad-hologram.glb`,e=>{if(l||n.aborted){e.scene.traverse(e=>{e.geometry?.dispose(),(Array.isArray(e.material)?e.material:[e.material]).forEach(e=>e?.dispose())});return}P=e.scene;let t=new r.Box3().setFromObject(P),i=t.getSize(new r.Vector3),a=t.getCenter(new r.Vector3),o=1.9/Math.max(i.y,.001);P.scale.setScalar(o),t.setFromObject(P),t.getCenter(a),P.position.sub(a),F=P.position.y,g.uMinY.value=t.min.y,g.uHeight.value=Math.max(i.y,.001),P.traverse(e=>{e.isMesh&&(e.material=ee)}),m.add(P),document.getElementById(`holo-loading`)?.classList.add(`done`),j(),I=.35,Q()},void 0,e=>{if(l||n.aborted)return;console.error(`Hologram failed to load:`,e);let t=document.getElementById(`holo-loading`);t&&(t.textContent=`Hologram unavailable`)});function W(){U()&&(A(),d.render(f,p))}let G=!1,K=0,q=0;function ve(){let n=t.getBoundingClientRect(),r=m.position.clone().project(p);return{x:n.left+(r.x+1)/2*n.width,y:n.top+(1-r.y)/2*n.height,r:e.clientWidth*.6}}t.addEventListener(`pointerdown`,e=>{if(!P||!U()||e.button!==0||e.target.closest(`a, button, input, select, textarea, .holo-caption`))return;let n=ve(),r=e.clientX-n.x,i=e.clientY-n.y;Math.hypot(r,i)<n.r&&(G=!0,K=e.clientX,t.setPointerCapture(e.pointerId))},{signal:n}),t.addEventListener(`pointermove`,e=>{if(G){let t=e.clientX-K;K=e.clientX,k+=t*.009,q=t*.009,B||W()}},{signal:n});let J=()=>G=!1;t.addEventListener(`pointerup`,J,{signal:n}),t.addEventListener(`pointercancel`,J,{signal:n}),t.addEventListener(`lostpointercapture`,J,{signal:n}),e.tabIndex=0,e.addEventListener(`keydown`,e=>{(e.key===`ArrowLeft`||e.key===`ArrowRight`)&&(e.preventDefault(),k+=e.key===`ArrowLeft`?-.18:.18,B||W())},{signal:n});let Y=(e,t,n)=>{let r=Math.min(Math.max((n-e)/(t-e),0),1);return r*r*(3-2*r)},X=!1;function ye(e){if(X)return;let t=Y(I,I+.5,e);C.material.opacity=t*.55,w.material.opacity=t*(.85+.15*Math.sin(e*40)),T.material.opacity=t*.7,D.intensity=t*8;let n=Y(.9,1.6,e);h.uBeam.value=n,v.uCode.value=n*(1-Y(2.9,3.6,e))*.9+.08,h.uSpawn.value=Y(1.15,2.75,e),e>3.6&&(X=!0)}function Z(){B=!1,cancelAnimationFrame(z),z=0,R=null}function be(){X=!0,h.uSpawn.value=1,h.uBeam.value=1,v.uCode.value=.25,C.material.opacity=.5,w.material.opacity=.9,T.material.opacity=.7,D.intensity=8,q=0,P&&(P.position.y=F,P.rotation.x=0,P.rotation.z=0)}function Q(){_e()?B||(B=!0,R=null,z=requestAnimationFrame(xe)):(Z(),ge()&&P&&be(),W())}function xe(e){if(!_e())return Z();let t=R===null?0:Math.min((e-R)/1e3,.05);R=e,L+=t;let n=L;h.uTime.value=n,A(),ye(n),X&&!G&&(k+=.4*t+q,q*=.94),m.rotation.y=k,X&&P&&(P.position.y=F+Math.sin(n*.85)*.04,P.rotation.z=Math.sin(n*.6)*.018,P.rotation.x=Math.sin(n*.45+1)*.014,D.intensity=8*(.82+.18*Math.sin(n*2.2)),h.uBeam.value=1+.09*Math.sin(n*1.7)),d.render(f,p),z=requestAnimationFrame(xe)}let $;`IntersectionObserver`in window?($=new IntersectionObserver(([e])=>{H=e.isIntersecting,Q()}),$.observe(e)):H=!0,s.addEventListener(`change`,()=>{c=s.matches,Q()},{signal:n}),document.addEventListener(`visibilitychange`,Q,{signal:n}),document.addEventListener(`zaddy:motionchange`,Q,{signal:n}),window.addEventListener(`scroll`,()=>{!B&&U()&&W()},{passive:!0,signal:n}),window.addEventListener(`pagehide`,()=>{V=!1,Z()},{signal:n}),window.addEventListener(`pageshow`,()=>{V=!0,j(),Q()},{signal:n}),n.addEventListener(`abort`,()=>{l=!0,Z(),$?.disconnect(),M.disconnect();let e=new Set,t=new Set,n=new Set;f.traverse(r=>{r.geometry&&e.add(r.geometry),(Array.isArray(r.material)?r.material:[r.material]).forEach(e=>{e&&(t.add(e),e.map&&n.add(e.map),Object.values(e.uniforms||{}).forEach(({value:e})=>{e?.isTexture&&n.add(e)}))})}),e.forEach(e=>e.dispose()),t.forEach(e=>e.dispose()),n.forEach(e=>e.dispose()),d.dispose(),d.domElement.remove()},{once:!0})}function c(){a?.(),a=o()}c(),document.addEventListener(`astro:page-load`,c),document.addEventListener(`astro:before-swap`,()=>{a?.(),a=null});