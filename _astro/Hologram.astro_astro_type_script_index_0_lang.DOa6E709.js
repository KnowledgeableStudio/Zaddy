const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["_astro/GLTFLoader.BiPItijB.js","_astro/three.module.C8enonVg.js"])))=>i.map(i=>d[i]);
import{t as e}from"./preload-helper.oCYlU9a4.js";var t=null;function n(){let e=document.getElementById(`holo-anchor`),t=document.getElementById(`story`);if(!e||!t)return null;let n=new AbortController,{signal:i}=n,a=!1,o=!1,s;function c(){a||!o||document.hidden||i.aborted||(a=!0,s?.disconnect(),r(e,t,i).catch(e=>{if(i.aborted)return;console.error(`Hologram initialization failed:`,e);let t=document.getElementById(`holo-loading`);t&&(t.textContent=`Hologram unavailable`)}))}return`IntersectionObserver`in window?(s=new IntersectionObserver(([e])=>{o=e.isIntersecting,c()},{rootMargin:`250px`}),s.observe(e)):(o=!0,c()),document.addEventListener(`visibilitychange`,c,{signal:i}),window.addEventListener(`pagehide`,e=>{e.persisted||(s?.disconnect(),n.abort())},{signal:i}),()=>{s?.disconnect(),n.abort()}}async function r(t,n,r){let[i,{GLTFLoader:a},{MeshoptDecoder:o}]=await Promise.all([e(()=>import(`./three.module.C8enonVg.js`),[]),e(()=>import(`./GLTFLoader.BiPItijB.js`),__vite__mapDeps([0,1])),e(()=>import(`./meshopt_decoder.module.DXTYc6wn.js`),[])]);if(r.aborted)return;let s=window.matchMedia(`(prefers-reduced-motion: reduce)`),c=s.matches,l=!1,u=new i.Color(`#22d861`),d;try{d=new i.WebGLRenderer({alpha:!0,antialias:!0})}catch{let e=document.getElementById(`holo-loading`);e&&(e.textContent=`Hologram unavailable`);return}d.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25)),d.setClearColor(0,0),d.domElement.style.cssText=`position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;`,n.appendChild(d.domElement);let f=new i.Scene,p=new i.PerspectiveCamera(38,1,.1,100),m=new i.Group;f.add(m);let h={uTime:{value:0},uColor:{value:u},uSpawn:{value:0},uBeam:{value:0}},g={uTime:h.uTime,uColor:h.uColor,uSpawn:h.uSpawn,uMinY:{value:-.95},uHeight:{value:1.9}},ee=new i.ShaderMaterial({uniforms:g,transparent:!0,blending:i.AdditiveBlending,depthWrite:!1,side:i.DoubleSide,vertexShader:`
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
    `});function te(e){return new i.ShaderMaterial({uniforms:{uTime:h.uTime,uColor:h.uColor,uBeam:h.uBeam,uStrength:{value:e}},transparent:!0,blending:i.AdditiveBlending,depthWrite:!1,side:i.DoubleSide,vertexShader:`
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
      `})}let ne=new i.Mesh(new i.CylinderGeometry(.78,.34,2,40,1,!0),te(.1)),re=new i.Mesh(new i.CylinderGeometry(.6,.22,2,40,1,!0),te(.22)),_=new i.Group;_.add(ne,re),_.position.y=4163336342344337e-32,m.add(_);function ie(){let e=document.createElement(`canvas`);e.width=512,e.height=512;let t=e.getContext(`2d`);t.clearRect(0,0,512,512);let n=512/28;t.font=`16px monospace`;for(let e=0;e<28;e++){let r=Math.floor(Math.random()*30),i=14+Math.floor(Math.random()*10);for(let a=0;a<i;a++){let i=`iZaCsnv01ｱｲｻﾞﾄﾞ<>[]#@$%&0101`[Math.floor(Math.random()*28)];t.fillStyle=Math.random()<.12?`rgba(190,255,215,0.95)`:`rgba(34,216,97,${.25+Math.random()*.55})`,t.fillText(i,e*n+1,(a+r)*n%512)}}let r=new i.CanvasTexture(e);return r.wrapS=i.RepeatWrapping,r.wrapT=i.RepeatWrapping,r.repeat.set(2,1),r}let v={uTime:h.uTime,uCode:{value:0},uMap:{value:ie()}},ae=new i.ShaderMaterial({uniforms:v,transparent:!0,blending:i.AdditiveBlending,depthWrite:!1,side:i.DoubleSide,vertexShader:`
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
    `}),oe=new i.Mesh(new i.CylinderGeometry(.68,.3,2,40,1,!0),ae);oe.position.y=_.position.y,m.add(oe);let y=new i.BufferGeometry;{let e=new Float32Array(160),t=new Float32Array(160),n=new Float32Array(160),r=new Float32Array(160),a=new Float32Array(160);for(let i=0;i<160;i++)e[i]=Math.random(),t[i]=Math.random()*Math.PI*2,n[i]=Math.random(),r[i]=.1+Math.random()*.16,a[i]=2+Math.random()*4;y.setAttribute(`position`,new i.BufferAttribute(new Float32Array(480),3)),y.setAttribute(`aSeed`,new i.BufferAttribute(e,1)),y.setAttribute(`aAngle`,new i.BufferAttribute(t,1)),y.setAttribute(`aRadius`,new i.BufferAttribute(n,1)),y.setAttribute(`aSpeed`,new i.BufferAttribute(r,1)),y.setAttribute(`aSize`,new i.BufferAttribute(a,1))}let se=new i.ShaderMaterial({uniforms:{uTime:h.uTime,uColor:h.uColor,uBeam:h.uBeam},transparent:!0,blending:i.AdditiveBlending,depthWrite:!1,vertexShader:`
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
    `}),b=new i.Points(y,se);b.position.y=-1,m.add(b);function x(e,t){let n=document.createElement(`canvas`);n.width=n.height=256;let r=n.getContext(`2d`),a=r.createRadialGradient(128,128,0,128,128,128);return a.addColorStop(0,e),a.addColorStop(.45,t),a.addColorStop(1,`rgba(34,216,97,0)`),r.fillStyle=a,r.fillRect(0,0,256,256),new i.CanvasTexture(n)}let S=new i.Mesh(new i.CircleGeometry(.82,48),new i.MeshBasicMaterial({map:x(`rgba(120,255,170,0.5)`,`rgba(34,216,97,0.16)`),transparent:!0,blending:i.AdditiveBlending,depthWrite:!1}));S.rotation.x=-Math.PI/2,S.position.y=-1.12,S.scale.y=.55,m.add(S);let ce=new i.ShaderMaterial({uniforms:{uTime:h.uTime,uColor:h.uColor,uBeam:h.uBeam},transparent:!0,blending:i.AdditiveBlending,depthWrite:!1,vertexShader:`
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
    `}),C=new i.Mesh(new i.CircleGeometry(.82,48),ce);C.rotation.x=-Math.PI/2,C.position.y=-1.1190000000000002,C.scale.y=.55,m.add(C);let le=new i.MeshStandardMaterial({color:1316378,metalness:.85,roughness:.32}),ue=new i.MeshStandardMaterial({color:723982,metalness:.9,roughness:.45}),de=new i.Mesh(new i.CylinderGeometry(.46,.52,.1,56),le);de.position.y=-1.07,m.add(de);let fe=new i.Mesh(new i.CylinderGeometry(.4,.46,.05,56),ue);fe.position.y=-.9950000000000001,m.add(fe);let w=new i.Mesh(new i.RingGeometry(.18,.3,48),new i.MeshBasicMaterial({color:2283617,transparent:!0,opacity:0,blending:i.AdditiveBlending,side:i.DoubleSide,depthWrite:!1}));w.rotation.x=-Math.PI/2,w.position.y=-.9680000000000001,m.add(w);let T=new i.Mesh(new i.CircleGeometry(.17,40),new i.MeshBasicMaterial({color:12582877,transparent:!0,opacity:0,blending:i.AdditiveBlending,depthWrite:!1}));T.rotation.x=-Math.PI/2,T.position.y=-.9670000000000001,m.add(T);let E=new i.Mesh(new i.CircleGeometry(.34,40),new i.MeshBasicMaterial({map:x(`rgba(160,255,200,0.8)`,`rgba(34,216,97,0.25)`),transparent:!0,opacity:0,blending:i.AdditiveBlending,depthWrite:!1}));E.rotation.x=-Math.PI/2,E.position.y=-.9600000000000001,m.add(E),f.add(new i.AmbientLight(3159613,.9));let D=new i.DirectionalLight(14674146,1.4);D.position.set(2.5,3,2.5),f.add(D);let O=new i.PointLight(2283617,0,4);m.add(O),O.position.set(0,-.8200000000000001,0);let k=Math.tan(p.fov*Math.PI/360),A=0;function pe(){let e=n.getBoundingClientRect(),r=e.width,i=e.height;if(!r||!i)return;d.setSize(r,i,!1),p.aspect=r/i;let a=(t.clientHeight||i*.5)*1.12,o=t.clientWidth||r*.6,s=2.35*i/(2*k*a),c=1.7*r/(2*k*p.aspect*o),l=Math.max(s,c,2.4);p.position.set(0,0,Math.min(l,40)),p.lookAt(0,0,0),p.updateProjectionMatrix(),p.updateMatrixWorld()}let me=new i.Vector3;function j(){let e=n.getBoundingClientRect(),r=t.getBoundingClientRect(),i=e.width,a=e.height;if(!i||!a)return;let o=r.left+r.width/2-e.left;p.setViewOffset(i,a,i/2-o,0,i,a);let s=-((r.bottom-e.top)/a*2-1),c=me.set(0,s,.5).unproject(p).sub(p.position).normalize(),l=-p.position.z/c.z,u=p.position.y+c.y*l;m.position.set(0,u- -1.14,0),m.rotation.y=A}function M(){pe(),j(),B||W()}let N=new ResizeObserver(M);N.observe(n),N.observe(t),window.addEventListener(`resize`,M,{signal:r});let P=new a;P.setMeshoptDecoder(o);let F=null,I=0,L=-1,he=0,R=null,z=0,B=!1,V=!0,ge=t.getBoundingClientRect(),H=ge.bottom>0&&ge.top<window.innerHeight,U=()=>!l&&V&&H&&!document.hidden&&!!F,_e=()=>c||document.documentElement.dataset.motionPaused===`true`,ve=()=>U()&&!_e();P.load(`/models/izad-hologram.glb`,e=>{if(l||r.aborted){e.scene.traverse(e=>{e.geometry?.dispose(),(Array.isArray(e.material)?e.material:[e.material]).forEach(e=>e?.dispose())});return}F=e.scene;let t=new i.Box3().setFromObject(F),n=t.getSize(new i.Vector3),a=t.getCenter(new i.Vector3),o=1.9/Math.max(n.y,.001);F.scale.setScalar(o),t.setFromObject(F),t.getCenter(a),F.position.sub(a),I=F.position.y,g.uMinY.value=t.min.y,g.uHeight.value=Math.max(n.y,.001),F.traverse(e=>{e.isMesh&&(e.material=ee)}),m.add(F),document.getElementById(`holo-loading`)?.classList.add(`done`),M(),L=.35,Q()},void 0,e=>{if(l||r.aborted)return;console.error(`Hologram failed to load:`,e);let t=document.getElementById(`holo-loading`);t&&(t.textContent=`Hologram unavailable`)});function W(){U()&&(j(),d.render(f,p))}let G=!1,K=0,q=0;function ye(){let e=n.getBoundingClientRect(),r=m.position.clone().project(p);return{x:e.left+(r.x+1)/2*e.width,y:e.top+(1-r.y)/2*e.height,r:t.clientWidth*.6}}n.addEventListener(`pointerdown`,e=>{if(!F||!U()||e.button!==0||e.target.closest(`a, button, input, select, textarea, .holo-caption`))return;let t=ye(),r=e.clientX-t.x,i=e.clientY-t.y;Math.hypot(r,i)<t.r&&(G=!0,K=e.clientX,n.setPointerCapture(e.pointerId))},{signal:r}),n.addEventListener(`pointermove`,e=>{if(G){let t=e.clientX-K;K=e.clientX,A+=t*.009,q=t*.009,B||W()}},{signal:r});let J=()=>G=!1;n.addEventListener(`pointerup`,J,{signal:r}),n.addEventListener(`pointercancel`,J,{signal:r}),n.addEventListener(`lostpointercapture`,J,{signal:r}),t.tabIndex=0,t.addEventListener(`keydown`,e=>{(e.key===`ArrowLeft`||e.key===`ArrowRight`)&&(e.preventDefault(),A+=e.key===`ArrowLeft`?-.18:.18,B||W())},{signal:r});let Y=(e,t,n)=>{let r=Math.min(Math.max((n-e)/(t-e),0),1);return r*r*(3-2*r)},X=!1;function be(e){if(X)return;let t=Y(L,L+.5,e);w.material.opacity=t*.55,T.material.opacity=t*(.85+.15*Math.sin(e*40)),E.material.opacity=t*.7,O.intensity=t*8;let n=Y(.9,1.6,e);h.uBeam.value=n,v.uCode.value=n*(1-Y(2.9,3.6,e))*.9+.08,h.uSpawn.value=Y(1.15,2.75,e),e>3.6&&(X=!0)}function Z(){B=!1,cancelAnimationFrame(z),z=0,R=null}function xe(){X=!0,h.uSpawn.value=1,h.uBeam.value=1,v.uCode.value=.25,w.material.opacity=.5,T.material.opacity=.9,E.material.opacity=.7,O.intensity=8,q=0,F&&(F.position.y=I,F.rotation.x=0,F.rotation.z=0)}function Q(){ve()?B||(B=!0,R=null,z=requestAnimationFrame(Se)):(Z(),_e()&&F&&xe(),W())}function Se(e){if(!ve())return Z();let t=R===null?0:Math.min((e-R)/1e3,.05);R=e,he+=t;let n=he;h.uTime.value=n,j(),be(n),X&&!G&&(A+=.4*t+q,q*=.94),m.rotation.y=A,X&&F&&(F.position.y=I+Math.sin(n*.85)*.04,F.rotation.z=Math.sin(n*.6)*.018,F.rotation.x=Math.sin(n*.45+1)*.014,O.intensity=8*(.82+.18*Math.sin(n*2.2)),h.uBeam.value=1+.09*Math.sin(n*1.7)),d.render(f,p),z=requestAnimationFrame(Se)}let $;`IntersectionObserver`in window?($=new IntersectionObserver(([e])=>{H=e.isIntersecting,Q()}),$.observe(t)):H=!0,s.addEventListener(`change`,()=>{c=s.matches,Q()},{signal:r}),document.addEventListener(`visibilitychange`,Q,{signal:r}),document.addEventListener(`zaddy:motionchange`,Q,{signal:r}),window.addEventListener(`scroll`,()=>{!B&&U()&&W()},{passive:!0,signal:r}),window.addEventListener(`pagehide`,()=>{V=!1,Z()},{signal:r}),window.addEventListener(`pageshow`,()=>{V=!0,M(),Q()},{signal:r}),r.addEventListener(`abort`,()=>{l=!0,Z(),$?.disconnect(),N.disconnect();let e=new Set,t=new Set,n=new Set;f.traverse(r=>{r.geometry&&e.add(r.geometry),(Array.isArray(r.material)?r.material:[r.material]).forEach(e=>{e&&(t.add(e),e.map&&n.add(e.map),Object.values(e.uniforms||{}).forEach(({value:e})=>{e?.isTexture&&n.add(e)}))})}),e.forEach(e=>e.dispose()),t.forEach(e=>e.dispose()),n.forEach(e=>e.dispose()),d.dispose(),d.domElement.remove()},{once:!0})}function i(){t?.(),t=n()}i(),document.addEventListener(`astro:page-load`,i),document.addEventListener(`astro:before-swap`,()=>{t?.(),t=null});