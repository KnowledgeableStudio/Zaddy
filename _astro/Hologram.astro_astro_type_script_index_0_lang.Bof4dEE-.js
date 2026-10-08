const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["_astro/GLTFLoader.BiPItijB.js","_astro/three.module.C8enonVg.js"])))=>i.map(i=>d[i]);
var e=(function(){let e=typeof document<`u`&&document.createElement(`link`).relList;return e&&e.supports&&e.supports(`modulepreload`)?`modulepreload`:`preload`})(),t=function(e){return`/`+e},n={},r=function(e){return e.pathname.endsWith(`.css`)},i=function(i,a,o){let s=Promise.resolve();if(a&&a.length>0){let i,c=document.querySelector(`meta[property=csp-nonce]`),l=c?.nonce||c?.getAttribute(`nonce`);function u(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}function d(e){return import.meta.resolve?new URL(import.meta.resolve(e)):new URL(e,import.meta.url)}s=u(a.map(a=>{a=t(a,o);let s=d(a);if(s.href in n)return;n[s.href]=!0;let c=r(s);if(i===void 0){i={all:new Set,styles:new Set};let e=document.getElementsByTagName(`link`);for(let t=e.length-1;t>=0;t--){let n=e[t];i.all.add(n.href),n.rel===`stylesheet`&&i.styles.add(n.href)}}if((c?i.styles:i.all).has(s.href))return;let u=document.createElement(`link`);if(u.rel=c?`stylesheet`:e,c||(u.as=`script`),u.crossOrigin=``,u.href=s.href,l&&u.setAttribute(`nonce`,l),document.head.appendChild(u),c)return new Promise((e,t)=>{u.addEventListener(`load`,e),u.addEventListener(`error`,()=>t(Error(`Unable to preload CSS for ${s}`)))})}).filter(e=>e!==void 0))}function c(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return s.then(e=>{for(let t of e||[])t.status===`rejected`&&c(t.reason);return i().catch(c)})},a=document.getElementById(`holo-anchor`),o=document.getElementById(`story`);if(a&&o){let e=new IntersectionObserver(t=>{t[0].isIntersecting&&(e.disconnect(),s())},{rootMargin:`250px`});e.observe(a)}async function s(){let[e,{GLTFLoader:t},{MeshoptDecoder:n}]=await Promise.all([i(()=>import(`./three.module.C8enonVg.js`),[]),i(()=>import(`./GLTFLoader.BiPItijB.js`),__vite__mapDeps([0,1])),i(()=>import(`./meshopt_decoder.module.DXTYc6wn.js`),[])]),r=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,s=new e.Color(`#22d861`),c;try{c=new e.WebGLRenderer({alpha:!0,antialias:!0})}catch{let e=document.getElementById(`holo-loading`);e&&(e.textContent=`Hologram unavailable`);return}c.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75)),c.setClearColor(0,0),c.domElement.style.cssText=`position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;`,o.appendChild(c.domElement);let l=new e.Scene,u=new e.PerspectiveCamera(38,1,.1,100),d=new e.Group;l.add(d);let f={uTime:{value:0},uColor:{value:s},uSpawn:{value:0},uBeam:{value:0}},p={uTime:f.uTime,uColor:f.uColor,uSpawn:f.uSpawn,uMinY:{value:-.95},uHeight:{value:1.9}},ee=new e.ShaderMaterial({uniforms:p,transparent:!0,blending:e.AdditiveBlending,depthWrite:!1,side:e.DoubleSide,vertexShader:`
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;
      void main() {
        // subtle holographic wobble — the projection surface shimmers
        vec3 p = position;
        p.x += sin(p.y * 4.0 + uTime * 1.6) * 0.008;
        p.z += cos(p.y * 3.0 + uTime * 1.2) * 0.006;
        vec4 worldPos = modelMatrix * vec4(p, 1.0);
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
    `});function m(t){return new e.ShaderMaterial({uniforms:{uTime:f.uTime,uColor:f.uColor,uBeam:f.uBeam,uStrength:{value:t}},transparent:!0,blending:e.AdditiveBlending,depthWrite:!1,side:e.DoubleSide,vertexShader:`
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
      `})}let te=new e.Mesh(new e.CylinderGeometry(.78,.34,2,40,1,!0),m(.1)),h=new e.Mesh(new e.CylinderGeometry(.6,.22,2,40,1,!0),m(.22)),g=new e.Group;g.add(te,h),g.position.y=4163336342344337e-32,d.add(g);function _(){let t=document.createElement(`canvas`);t.width=512,t.height=512;let n=t.getContext(`2d`);n.clearRect(0,0,512,512);let r=512/28;n.font=`16px monospace`;for(let e=0;e<28;e++){let t=Math.floor(Math.random()*30),i=14+Math.floor(Math.random()*10);for(let a=0;a<i;a++){let i=`iZaCsnv01ｱｲｻﾞﾄﾞ<>[]#@$%&0101`[Math.floor(Math.random()*28)];n.fillStyle=Math.random()<.12?`rgba(190,255,215,0.95)`:`rgba(34,216,97,${.25+Math.random()*.55})`,n.fillText(i,e*r+1,(a+t)*r%512)}}let i=new e.CanvasTexture(t);return i.wrapS=e.RepeatWrapping,i.wrapT=e.RepeatWrapping,i.repeat.set(2,1),i}let v={uTime:f.uTime,uCode:{value:0},uMap:{value:_()}},ne=new e.ShaderMaterial({uniforms:v,transparent:!0,blending:e.AdditiveBlending,depthWrite:!1,side:e.DoubleSide,vertexShader:`
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
    `}),y=new e.Mesh(new e.CylinderGeometry(.68,.3,2,40,1,!0),ne);y.position.y=g.position.y,d.add(y);let b=new e.BufferGeometry;{let t=new Float32Array(160),n=new Float32Array(160),r=new Float32Array(160),i=new Float32Array(160),a=new Float32Array(160);for(let e=0;e<160;e++)t[e]=Math.random(),n[e]=Math.random()*Math.PI*2,r[e]=Math.random(),i[e]=.1+Math.random()*.16,a[e]=2+Math.random()*4;b.setAttribute(`position`,new e.BufferAttribute(new Float32Array(480),3)),b.setAttribute(`aSeed`,new e.BufferAttribute(t,1)),b.setAttribute(`aAngle`,new e.BufferAttribute(n,1)),b.setAttribute(`aRadius`,new e.BufferAttribute(r,1)),b.setAttribute(`aSpeed`,new e.BufferAttribute(i,1)),b.setAttribute(`aSize`,new e.BufferAttribute(a,1))}let x=new e.ShaderMaterial({uniforms:{uTime:f.uTime,uColor:f.uColor,uBeam:f.uBeam},transparent:!0,blending:e.AdditiveBlending,depthWrite:!1,vertexShader:`
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
    `}),S=new e.Points(b,x);S.position.y=-1,d.add(S);function C(t,n){let r=document.createElement(`canvas`);r.width=r.height=256;let i=r.getContext(`2d`),a=i.createRadialGradient(128,128,0,128,128,128);return a.addColorStop(0,t),a.addColorStop(.45,n),a.addColorStop(1,`rgba(34,216,97,0)`),i.fillStyle=a,i.fillRect(0,0,256,256),new e.CanvasTexture(r)}let w=new e.Mesh(new e.CircleGeometry(.82,48),new e.MeshBasicMaterial({map:C(`rgba(120,255,170,0.5)`,`rgba(34,216,97,0.16)`),transparent:!0,blending:e.AdditiveBlending,depthWrite:!1}));w.rotation.x=-Math.PI/2,w.position.y=-1.12,w.scale.y=.55,d.add(w);let re=new e.ShaderMaterial({uniforms:{uTime:f.uTime,uColor:f.uColor,uBeam:f.uBeam},transparent:!0,blending:e.AdditiveBlending,depthWrite:!1,vertexShader:`
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
    `}),T=new e.Mesh(new e.CircleGeometry(.82,48),re);T.rotation.x=-Math.PI/2,T.position.y=-1.1190000000000002,T.scale.y=.55,d.add(T);let ie=new e.MeshStandardMaterial({color:1316378,metalness:.85,roughness:.32}),E=new e.MeshStandardMaterial({color:723982,metalness:.9,roughness:.45}),D=new e.Mesh(new e.CylinderGeometry(.46,.52,.1,56),ie);D.position.y=-1.07,d.add(D);let O=new e.Mesh(new e.CylinderGeometry(.4,.46,.05,56),E);O.position.y=-.9950000000000001,d.add(O);let k=new e.Mesh(new e.RingGeometry(.18,.3,48),new e.MeshBasicMaterial({color:2283617,transparent:!0,opacity:0,blending:e.AdditiveBlending,side:e.DoubleSide,depthWrite:!1}));k.rotation.x=-Math.PI/2,k.position.y=-.9680000000000001,d.add(k);let A=new e.Mesh(new e.CircleGeometry(.17,40),new e.MeshBasicMaterial({color:12582877,transparent:!0,opacity:0,blending:e.AdditiveBlending,depthWrite:!1}));A.rotation.x=-Math.PI/2,A.position.y=-.9670000000000001,d.add(A);let j=new e.Mesh(new e.CircleGeometry(.34,40),new e.MeshBasicMaterial({map:C(`rgba(160,255,200,0.8)`,`rgba(34,216,97,0.25)`),transparent:!0,opacity:0,blending:e.AdditiveBlending,depthWrite:!1}));j.rotation.x=-Math.PI/2,j.position.y=-.9600000000000001,d.add(j),l.add(new e.AmbientLight(3159613,.9));let M=new e.DirectionalLight(14674146,1.4);M.position.set(2.5,3,2.5),l.add(M);let N=new e.PointLight(2283617,0,4);d.add(N),N.position.set(0,-.8200000000000001,0);let P=Math.tan(u.fov*Math.PI/360),F=0;function I(){let e=o.getBoundingClientRect(),t=e.width,n=e.height;if(!t||!n)return;c.setSize(t,n,!1),u.aspect=t/n;let r=a.clientHeight||n*.5,i=2.35*n/(2*P*r);u.position.set(0,0,Math.min(Math.max(i,2.4),9)),u.lookAt(0,0,0),u.updateProjectionMatrix(),u.updateMatrixWorld()}function L(){let t=o.getBoundingClientRect(),n=a.getBoundingClientRect(),r=t.width,i=t.height;if(!r||!i)return;let s=n.left+n.width/2-t.left;u.setViewOffset(r,i,r/2-s,0,r,i);let c=-((n.bottom-t.top)/i*2-1),l=new e.Vector3(0,c,.5).unproject(u).sub(u.position).normalize(),f=-u.position.z/l.z,p=u.position.y+l.y*f;d.position.set(0,p- -1.14,0),d.rotation.y=F}function R(){I(),L(),Q||W()}new ResizeObserver(R).observe(o),window.addEventListener(`resize`,R);let z=new t;z.setMeshoptDecoder(n);let B=null,V=0,H=-1,U=new e.Clock(!1);z.load(`/models/izad-hologram.glb`,t=>{B=t.scene;let n=new e.Box3().setFromObject(B),i=n.getSize(new e.Vector3),a=n.getCenter(new e.Vector3),o=1.9/Math.max(i.y,.001);B.scale.setScalar(o),n.setFromObject(B),n.getCenter(a),B.position.sub(a),V=B.position.y,p.uMinY.value=n.min.y,p.uHeight.value=Math.max(i.y,.001),B.traverse(e=>{e.isMesh&&(e.material=ee)}),d.add(B),document.getElementById(`holo-loading`)?.classList.add(`done`),R(),r?(f.uSpawn.value=1,f.uBeam.value=1,v.uCode.value=.25,k.material.opacity=.5,A.material.opacity=.9,j.material.opacity=.7,N.intensity=8,W(),window.addEventListener(`scroll`,()=>{L(),W()},{passive:!0})):(U.start(),H=.35,$())},void 0,e=>{console.error(`Hologram failed to load:`,e);let t=document.getElementById(`holo-loading`);t&&(t.textContent=`Hologram unavailable`)});function W(){c.render(l,u)}let G=!1,K=0,q=0;function ae(){let e=o.getBoundingClientRect(),t=d.position.clone().project(u);return{x:e.left+(t.x+1)/2*e.width,y:e.top+(1-t.y)/2*e.height,r:a.clientWidth*.6}}o.addEventListener(`pointerdown`,e=>{if(e.target.closest(`a, button, input, select, textarea, .holo-caption`))return;let t=ae(),n=e.clientX-t.x,r=e.clientY-t.y;Math.hypot(n,r)<t.r&&(G=!0,K=e.clientX,o.setPointerCapture(e.pointerId))}),o.addEventListener(`pointermove`,e=>{if(G){let t=e.clientX-K;K=e.clientX,F+=t*.009,q=t*.009,r&&W()}});let J=()=>G=!1;o.addEventListener(`pointerup`,J),o.addEventListener(`pointercancel`,J),a.tabIndex=0,a.addEventListener(`keydown`,e=>{(e.key===`ArrowLeft`||e.key===`ArrowRight`)&&(e.preventDefault(),F+=e.key===`ArrowLeft`?-.18:.18,r&&W())});let Y=(e,t,n)=>{let r=Math.min(Math.max((n-e)/(t-e),0),1);return r*r*(3-2*r)},X=!1;function oe(e){if(X)return;let t=Y(H,H+.5,e);k.material.opacity=t*.55,A.material.opacity=t*(.85+.15*Math.sin(e*40)),j.material.opacity=t*.7,N.intensity=t*8;let n=Y(.9,1.6,e);f.uBeam.value=n,v.uCode.value=n*(1-Y(2.9,3.6,e))*.9+.08,f.uSpawn.value=Y(1.15,2.75,e),e>3.6&&(X=!0)}let Z=0,Q=!1;function $(){Q=!0;let e=U.getDelta(),t=U.elapsedTime;f.uTime.value=t,L(),oe(t),X&&!G&&(F+=.4*e+q,q*=.94),d.rotation.y=F,X&&B&&(B.position.y=V+Math.sin(t*.85)*.04,B.rotation.z=Math.sin(t*.6)*.018,B.rotation.x=Math.sin(t*.45+1)*.014,N.intensity=8*(.82+.18*Math.sin(t*2.2)),f.uBeam.value=1+.09*Math.sin(t*1.7)),c.render(l,u),Z=requestAnimationFrame($)}new IntersectionObserver(e=>{let t=e[0].isIntersecting;!r&&B&&(t&&!Q?$():!t&&Q&&(Q=!1,cancelAnimationFrame(Z)))}).observe(a)}