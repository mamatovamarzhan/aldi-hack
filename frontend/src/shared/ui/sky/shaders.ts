export const screenVertex = `
varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.999,1.0);}`;

export const noiseGLSL = `
float hash(float n){return fract(sin(n)*43758.5453);}
float hash3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.,a=.55;for(int i=0;i<5;i++){v+=a*noise3(p);p=p*2.03+vec3(13.1,5.3,7.7);a*=.49;}return v;}
`;

export const skyFragment = `
varying vec2 vUv;
uniform float uTime,uAspect,uNight,uSunset,uDay,uSunY,uMeteor;
uniform vec2 uOffset,uSunPosition;
uniform vec3 uZenith,uMiddle,uHorizon,uCloud,uShadow,uHill,uNear,uAuroraLilac,uAuroraTeal,uAuroraGreen;
${noiseGLSL}
float stars(vec2 uv,float scale,float seed){
 vec2 g=uv*scale;vec2 id=floor(g),f=fract(g);float h=hash3(vec3(id,seed));
 vec2 pt=vec2(hash(h*172.),hash(h*301.));float radius=mix(.022,.095,pow(h,14.));
 float s=exp(-dot(f-pt,f-pt)/(radius*radius));
 return s*step(.62,h)*(.75+.25*sin(uTime*(.4+h)+h*90.));
}
float hillY(float x,float layer){return .09+layer*.035+sin(x*2.3+layer*1.9)*.024+sin(x*4.9+layer*2.7)*.009;}
void main(){
 vec2 uv=vUv;vec2 p=vec2((uv.x-.5)*uAspect,uv.y)+uOffset;
 float altitude=smoothstep(.17,1.,p.y);
 vec3 col=mix(uHorizon,uMiddle,smoothstep(.13,.32,p.y));col=mix(col,uZenith,smoothstep(.32,1.,p.y));
 vec2 sun=uSunPosition+uOffset;
 float sd=length(p-sun);
 // No separate solar disk: only soft scattering behind Aldi's sphere.
 col+=uCloud*exp(-sd*12.)*.09*uDay;
 float band=exp(-pow((p.x+.55-p.y*.8)*2.7,2.));
 float dust=fbm(vec3(p*6.,2.));
 col+=mix(vec3(.32,.36,.52),vec3(.61,.51,.67),dust)*band*(.025+pow(dust,3.)*.16)*uNight;
 float s=stars(p,88.,1.)+stars(p,145.,7.)*.5+stars(p,220.,11.)*.22;
 col+=mix(vec3(.77,.87,1.),vec3(1.,.91,.72),hash3(vec3(floor(p*88.),1.)))*s*1.8*uNight*smoothstep(.22,.55,p.y);
 // Three softly pleated curtains, low-intensity and high in the sky.
 for(int i=0;i<3;i++){
  float k=float(i);float wave=.71+k*.061+sin(p.x*2.4+uTime*.035+k)*.055+sin(p.x*5.2-uTime*.022)*.014;
  float curtain=exp(-pow((p.y-wave)*30.,2.));
  float folds=.35+.65*noise3(vec3(p.x*26.,p.y*2.,uTime*.04+k));
  vec3 a=i==0?uAuroraTeal:(i==1?uAuroraLilac:uAuroraGreen);
  col+=a*curtain*folds*.105*uNight;
 }
 if(uMeteor>=0.){
  vec2 head=vec2(.27*uAspect-uMeteor*.55,.88-uMeteor*.28);
  vec2 q=p-head;float along=dot(q,normalize(vec2(.55,.28)));
  float crossD=abs(q.x*.454-q.y*.891);
  float tail=exp(-crossD*1600.)*exp(-max(along,0.)*28.)*step(0.,along)*step(along,.25);
  col+=vec3(.8,.87,1.)*tail*sin(uMeteor*3.14159)*uNight;
 }
 // Rolling hills restricted to the bottom approximately eighteen percent.
 for(int i=3;i>=0;i--){
  float l=float(i);float hy=hillY(p.x+uOffset.x*l,l);
  float cover=1.-smoothstep(hy-.001,hy+.001,p.y);
  vec3 hc=mix(uNear,uHill,l/3.);
  hc=mix(hc,uHorizon,l*.105);
  float texture=fbm(vec3(p.x*38.,p.y*95.,l*7.));
  hc*=.88+texture*.24;col=mix(col,hc,cover);
 }
 gl_FragColor=vec4(clamp(col,vec3(0.),vec3(8.)),1.);
}`;

export const grassVertex = `
attribute vec3 aRoot;attribute float aSeed;varying float vTip,vSeed;
uniform float uTime,uAspect;uniform vec2 uOffset;
${noiseGLSL}
void main(){
 vTip=uv.y;vSeed=aSeed;vec3 p=position;
 float gust=noise3(vec3(aRoot.x*2.,uTime*.11,aRoot.y*3.));
 p.x+=pow(uv.y,2.)*(sin(uTime*.8+aSeed*16.)*.009+gust*.018);
 p.xy+=aRoot.xy+uOffset*vec2(.08,.04);
 p.x/=uAspect;gl_Position=vec4(p.x,p.y,0.1,1.);
}`;
export const grassFragment = `
uniform vec3 uNear,uHill;varying float vTip,vSeed;
void main(){vec3 color=mix(uNear*.68,uHill*1.1,vTip*.65+vSeed*.2);gl_FragColor=vec4(color,1.);}`;
export const particleVertex = `
attribute float aSeed;attribute float aSize;attribute vec3 aColor;
uniform float uTime,uAspect,uNight,uDpr;uniform vec2 uOffset;
varying vec3 vColor;varying float vAlpha;
void main(){
 vec3 p=position;bool fire=aSeed<.5;
 p.x+=sin(uTime*(fire?.18:.04)+aSeed*120.)*(fire?.06:.12);
 p.y+=sin(uTime*.23+aSeed*94.)*(fire?.018:.04);
 if(!fire){p.x=mod(p.x+uTime*.009+uAspect,uAspect*2.)-uAspect;}
 p.xy+=uOffset*.16;
 vAlpha=fire?uNight*pow(.5+.5*sin(uTime*.8+aSeed*100.),2.):(1.-uNight)*.5;
 vColor=aColor;gl_Position=vec4(p.x/uAspect,p.y,.05,1.);gl_PointSize=aSize*uDpr;
}`;
export const particleFragment = `
varying vec3 vColor;varying float vAlpha;
void main(){float d=length(gl_PointCoord-.5);float a=exp(-d*d*24.)*vAlpha;gl_FragColor=vec4(vColor*1.5,a);}`;
export const flowerVertex = `
attribute vec3 aRoot;attribute vec3 aColor;attribute float aSeed;
uniform float uTime,uAspect;uniform vec2 uOffset;varying vec2 vUv;varying vec3 vColor;
void main(){vUv=uv;vColor=aColor;vec3 p=position;p.x+=sin(uTime*.7+aSeed*12.)*.004*uv.y;p.xy+=aRoot.xy+uOffset*vec2(.08,.04);gl_Position=vec4(p.x/uAspect,p.y,.08,1.);}`;
export const flowerFragment = `
varying vec2 vUv;varying vec3 vColor;uniform float uNight;
void main(){vec2 q=(vUv-.5)*2.;float angle=atan(q.y,q.x);float r=length(q);float petals=.53+.20*cos(angle*5.);float a=1.-smoothstep(petals-.07,petals,r);if(a<.01)discard;vec3 c=mix(vColor,vec3(1.,.84,.43),1.-smoothstep(.1,.24,r));gl_FragColor=vec4(c*mix(1.,.42,uNight),a);}`;
