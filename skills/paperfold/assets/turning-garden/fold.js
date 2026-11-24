"use strict";

(() => {
  const $=id=>document.getElementById(id);
  const canvas=$("garden"), range=$("seek"), readout=$("angle"), play=$("play");
  const exportMode=new URLSearchParams(location.search).has("export");
  document.body.classList.toggle("export",exportMode);
  const gl=canvas.getContext("webgl",{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:exportMode});
  if(!gl){$("fallback").hidden=false;document.querySelectorAll("button,input").forEach(el=>el.disabled=true);return;}
  const {radius,start}=TurningGarden;
  const tau=Math.PI*2,duration=GardenLife.duration,leafHeight=4.25;
  const radians=n=>n*Math.PI/180;
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const ease=n=>{const x=clamp(n,0,1);return x*x*(3-2*x);};
  let playing=false,angle=0,drag=null,clock=0,playhead=0,lastTick=0;
  let gustAge=-Infinity,callAge=-Infinity,extraSpin=0,orbit=0,tilt=0,magnification=1;
  let animationFrame=0;
  let orbitMode=false,angleRate=0,dragRate=0,manualAction=false;
  let orbitTarget=0,tiltTarget=0,zoomTarget=1;
  let awning=0,awningTarget=0;
  let catAge=-Infinity,dusk=0,lightOverride=null,settledTime=0;
  let catCloseup=false,focusWeight=0,focusPoint=null,flightPoint=null;
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  let frozen=reduced.matches;

  const projection=`
    uniform vec2 uFrame,uView,uCenter;
    vec3 turn(vec3 p,float a){
      return vec3(cos(a)*p.x+sin(a)*p.z, p.y, cos(a)*p.z-sin(a)*p.x);
    }
    vec4 camera(vec3 p){
      vec3 q=turn(p,uView.x);
      float vertical=q.y*cos(uView.y)-q.z*sin(uView.y);
      float depth=q.y*sin(uView.y)+q.z*cos(uView.y);
      return vec4(q.x*uFrame.x+uCenter.x,vertical*uFrame.y+uCenter.y,-depth*.086,1.);
    }
  `;
  const lightProjection=`
    vec3 lightSpace(vec3 p){
      float x=.7776*p.x+.6288*p.z;
      float z=.7776*p.z-.6288*p.x;
      return vec3(x*.129,(.752*p.y-.659*z)*.129,-(.752*z+.659*p.y)*.100);
    }
  `;
  const shadows=`
    uniform sampler2D uShadow;
    float shadowTap(vec2 uv,float depth){
      vec2 map=texture2D(uShadow,uv).rg;
      return step(map.x+map.y/255.,depth);
    }
    float shadeAt(vec3 coord,float bias){
      vec3 p=coord*.5+.5;
      if(min(p.x,p.y)<.005||max(p.x,p.y)>.995)return 0.;
      float d=p.z-bias;
      vec2 s=vec2(2.6/1024.);
      float near=shadowTap(p.xy+vec2(s.x,0.),d)+shadowTap(p.xy-vec2(s.x,0.),d)+
        shadowTap(p.xy+vec2(0.,s.y),d)+shadowTap(p.xy-vec2(0.,s.y),d);
      float wide=shadowTap(p.xy+vec2(s.x,s.y),d)+shadowTap(p.xy+vec2(-s.x,s.y),d)+
        shadowTap(p.xy+vec2(s.x,-s.y),d)+shadowTap(p.xy-vec2(s.x,s.y),d);
      return .28*shadowTap(p.xy,d)+.10*near+.08*wide;
    }
  `;
  const evening=`
    uniform float uDusk;
    uniform vec3 uLampState;
    vec3 twilight(vec3 color,float sunlight){
      vec3 cool=color*vec3(.56,.64,.78)+vec3(.033,.025,.054);
      vec3 rim=vec3(.13,.064,.009)*sunlight*max(max(color.r,color.g),color.b);
      return mix(color,cool+rim,uDusk);
    }
  `;
  function program(v,f,layout){
    const result=gl.createProgram();
    for(const [type,source] of [[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){
      const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
      gl.attachShader(result,shader);
    }
    layout.forEach((name,i)=>gl.bindAttribLocation(result,i,name));
    gl.linkProgram(result);
    if(!gl.getProgramParameter(result,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(result));
    return result;
  }
  const scenery=program(`
    attribute vec3 aPoint,aNormal,aPaint;
    attribute vec4 aHinge,aMotion;
    uniform float uAngle,uTime,uShadowPass,uWind,uSpin,uAwning;
    uniform vec3 uBirdPos;
    uniform vec4 uBirdPose;
    varying vec3 vColor,vMaterialPoint;
    varying vec3 vLighting;
    varying float vHeight,vProgress,vSun;
    ${projection}
    ${lightProjection}
    ${evening}
    vec3 swing(vec3 p,float s){
      return vec3(p.x,cos(s)*p.y-sin(s)*p.z,sin(s)*p.y+cos(s)*p.z);
    }
    vec3 roll(vec3 p,float a){
      return vec3(cos(a)*p.x-sin(a)*p.y,sin(a)*p.x+cos(a)*p.y,p.z);
    }
    ${GardenCat.shader}
    void main(){
      float t=clamp((uAngle-aMotion.x)/aMotion.y,0.,1.);
      float smoothT=smoothstep(0.,1.,t);
      float bounce=.035*sin(12.56637*t)*smoothstep(.45,.78,t)*pow(1.-t,1.15);
      vec3 base=aHinge.xyz;
      vec3 p=aPoint,n=aNormal;
      if(aMotion.z>.5&&aMotion.z<1.5){
        float bank=(1.-smoothT)*1.49;
        vec3 local=turn(aPoint-base,-aHinge.w);
        float spread=smoothstep(.0,.42,t);
        local.y*=mix(.03,1.,spread);
        local.z*=mix(.024,1.,spread);
        p=base+turn(swing(local,bank),aHinge.w);
        n=turn(swing(turn(aNormal,-aHinge.w),bank),aHinge.w);
      }else if(aMotion.z>9.5){
        vec3 v=p-base;
        float wobble=(.06+.13*uWind)*sin(uTime*3.15+base.x*1.3+aHinge.w);
        p=base+roll(v,wobble)*smoothT;
        n=roll(n,wobble);
      }else if(aMotion.z>8.5){
        poseGardenCat(p,n,base,aHinge.w,smoothT);
      }else if(aMotion.z>7.5){
        float h=max(0.,p.y-base.y),phase=uTime*2.3-h*8.;
        p.x+=h*(.22+.18*uWind)+h*.20*sin(phase);
        p.z+=h*.17*cos(phase+.55);
        p.y=base.y+h*smoothT*(.86+.12*sin(uTime*2.1));
        p.xz=mix(base.xz,p.xz,smoothT);
      }else if(aMotion.z>6.5){
        float wing=smoothstep(.11,.59,abs(p.x));
        float tucked=(1.-smoothstep(0.,18.,uAngle))*wing;
        p.z-=.29*tucked;p.x*=1.-.73*tucked;
        float flap=uBirdPose.w*wing*sign(p.x);
        p=roll(p,flap);
        n=roll(n,flap);
        p=uBirdPos+turn(swing(roll(p,uBirdPose.z),-uBirdPose.y),uBirdPose.x);
        n=turn(swing(roll(n,uBirdPose.z),-uBirdPose.y),uBirdPose.x);
      }else if(aMotion.z>5.5){
        float seed=aMotion.w;
        float age=fract(uTime*.245+uSpin*.013+seed);
        float envelope=smoothT*smoothstep(0.,.13,age)*(1.-smoothstep(.81,1.,age));
        vec3 leaf=roll(turn(p-base,age*9.+seed),age*7.+seed);
        p=base+leaf*envelope+vec3(age*(.60+.49*uWind)+.23*sin(age*8.+seed),
          -1.44*age+.10*sin(age*12.+seed),.73*age+.20*sin(age*9.+2.*seed));
      }else if(aMotion.z>4.5){
        float drop=max(0.,base.y-p.y);
        float wave=sin(uTime*5.7-base.z*1.85+aMotion.w)*(.45+uWind*.59);
        vec3 flag=p-base;
        flag.x+=wave*drop*.94;flag.z+=wave*drop*.27;flag.y+=abs(wave)*drop*.40;
        p=base+flag*smoothT;
      }else if(aMotion.z>3.5){
        p=base+turn(roll(p-base,-uSpin),.53)*smoothT;
        n=turn(roll(n,-uSpin),.53);
      }else if(aMotion.z>2.5){
        vec3 wing=p-base;
        float f=sin(uTime*18.5+base.x)*sign(wing.x)*.82;
        p=base+vec3(wing.x*cos(f)-wing.y*sin(f),wing.x*sin(f)+wing.y*cos(f),wing.z);
        p+=vec3(.34*sin(uTime*2.25+base.x),.05+.20*sin(uTime*3.8+base.z),.23*cos(uTime*2.1+base.x))*smoothT;
        p.y=mix(.08,p.y,smoothT);
      }else if(aMotion.z>1.5){
        p.y=base.y+(p.y-base.y)*(smoothT+bounce);
        p.xz=base.xz+(p.xz-base.xz)*mix(.015,1.,smoothstep(.0,.61,t));
      }
      float r=aMotion.w;
      if(r<-.5){
        float breeze=sin(uTime*2.48-1.43)+.24*sin(uTime*4.1+p.x*.26);
        float bend=smoothT*p.y*p.y*.028*(.45+uWind)*breeze;
        p.x+=bend;p.z+=bend*.48;
        if(r< -1.25)p.y+=.026*smoothT*sin(uTime*3.37+p.x*2.+p.z)*(.35+uWind);
      }
      if(r>.0&&aMotion.z<2.5){
        float swell=sin(uTime*3.7-p.x*1.4-p.z*.85);
        float detail=sin(uTime*6.1+p.x*4.7-p.z*2.1);
        if(r>1.8){
          float run=max(0.,aPoint.z-2.8152);
          p.z-=run*.84*uAwning;
          p.y+=(2.124-p.y)*uAwning*.93+sin(run*25.)*min(1.,run*6.)*uAwning*.075;
          float freeEdge=smoothstep(2.80,4.08,aPoint.z);
          float cloth=(swell*.074+detail*.022)*(.45+uWind)*freeEdge*smoothT;
          p.y+=cloth;p.z+=cloth*.46;n.z+=cloth*.72;
        }else{
          float bend=clamp(length(p-base),0.,.95)*r*smoothT;
          float sway=(swell*.14+detail*.032)*(.46+uWind)*bend;
          p.x+=sway;p.z+=sway*.42;p.y+=abs(sway)*.24;
        }
      }
      float light=dot(normalize(n),vec3(-.473,.659,.585));
      float diffuse=max(light,0.);
      float shade=.77+diffuse*.28+.09*max(n.y,0.);
      vec3 pigment=aPaint;
      bool glass=pigment.r<0.;
      if(glass)pigment.r=-1.-pigment.r;
      vec3 stock=mix(pigment*vec3(.96,.91,.85),vec3(.88,.80,.63),.48);
      vec3 lit=mix(pigment*vec3(.96,.99,1.026),pigment*vec3(1.064,1.035,.967),diffuse);
      vColor=twilight(mix(stock,lit,smoothstep(.08,.64,t))*shade,diffuse);
      vec3 fromGate=p-vec3(-1.73,1.39,4.03),fromStall=p-vec3(1.55,1.25,4.00);
      float lamplight=max(0.,1.-dot(fromGate,fromGate)*.49)*uLampState.x+max(0.,1.-dot(fromStall,fromStall)*.56)*uLampState.y;
      vColor+=vec3(.215,.109,.019)*lamplight*lamplight*smoothstep(.38,.96,uDusk)*(.30+.68*pigment);
      if(glass){
        float cue=.18+.28*clamp((base.x+2.)*.22,0.,1.)+.11*step(1.35,aPoint.y);
        float candle=smoothstep(cue,cue+.30,uDusk)*smoothT;
        float pane=.72+.28*pigment.g;
        vec3 amber=mix(vec3(1.,.71,.34),vec3(1.,.89,.61),clamp(.54*pigment.r+.32*max(n.y,0.),0.,1.));
        vColor=mix(vColor,amber*pane,candle);
      }
      vHeight=p.y;
      vProgress=aMotion.z<.5?1.:t;
      vMaterialPoint=aPoint;
      vLighting=lightSpace(p);
      vSun=diffuse;
      gl_Position=uShadowPass>.5?vec4(vLighting,1.):camera(p);
    }`,`
    precision highp float;
    uniform float uShadowPass;
    varying vec3 vColor,vMaterialPoint,vLighting;
    varying float vHeight,vProgress,vSun;
    ${shadows}
    void main(){
      if(vHeight<.003||vProgress<.009)discard;
      if(uShadowPass>.5){
        float depth=gl_FragCoord.z*255.;
        gl_FragColor=vec4(floor(depth)/255.,fract(depth),0.,1.);
      }else{
        float shadow=shadeAt(vLighting,mix(.0037,.0019,vSun));
        float mottled=sin(13.1*vMaterialPoint.x+9.4*vMaterialPoint.z)*sin(15.7*vMaterialPoint.y+7.1*vMaterialPoint.z);
        float grain=sin(258.1*vMaterialPoint.x+109.9*vMaterialPoint.z)*sin(237.9*vMaterialPoint.y+103.4*vMaterialPoint.z);
        vec3 ink=vColor*(1.+grain*.021+mottled*.032);
        gl_FragColor=vec4(ink*(1.-shadow*(.13+vSun*.175)),1.);
      }
    }`,["aPoint","aNormal","aPaint","aHinge","aMotion"]);

  const paper=program(`
    attribute vec3 aPoint;
    attribute vec2 aUV;
    varying vec3 vPoint;
    varying vec2 vUV;
    varying vec3 vLighting;
    uniform float uMaterial,uAngle,uStart,uRadius,uFacing,uBearing,uPacking;
    ${projection}
    ${lightProjection}
    void main(){
      vec3 p=aPoint;
      if(uMaterial>.5&&uMaterial<2.5){
        float a=min(uAngle,aPoint.z);
        float width=min(uAngle,.593412);
        float age=clamp((uAngle-a)/max(width,.0001),0.,1.);
        float envelope=sin(3.141593*age);
        float mountain=1.-abs(mod(a/.130899694,2.)-1.);
        float pressure=smoothstep(0.,.244346,uAngle)*smoothstep(0.,.20944,6.283185-uAngle);
        float h=(.19+.73*mountain)*envelope*envelope*pressure*aPoint.x/uRadius;
        p=vec3(aPoint.x*sin(a+uStart),h+aPoint.y,aPoint.x*cos(a+uStart));
      }else if(uMaterial>2.5&&uMaterial<6.5){
        float u=aPoint.x,v=aPoint.z,side=aPoint.y;
        float open=smoothstep(0.,.15708,min(uAngle,6.283185-uAngle));
        float a=uBearing+uFacing*.008*sin(u*3.4+v*.75)*u*open*(1.-uPacking);
        float h=(v*(4.25-.22*pow(u,4.))+.026*sin(u*3.141593))*(1.-uPacking)-.19*pow(uPacking,3.);
        float accordion=(1.-abs(mod(v*8.,2.)-1.))*.38*sin(uPacking*2.63894)*u*uFacing;
        float thick=.024*side*u+accordion;
        p=vec3(uRadius*u*sin(a)+cos(a)*thick,h,uRadius*u*cos(a)-sin(a)*thick);
      }else if(uMaterial>6.5){
        p.y=aPoint.y*4.25*(1.-uPacking)-.19*pow(uPacking,3.);
      }
      vPoint=p;
      vUV=aUV;
      vLighting=lightSpace(p);
      gl_Position=camera(p);
    }`,`
    precision highp float;
    uniform sampler2D uPlan,uLand,uLeft,uRight,uCover;
    uniform float uAngle,uStart,uRadius,uMaterial,uViewLight,uLeafLight;
    varying vec3 vPoint;
    varying vec2 vUV;
    varying vec3 vLighting;
    ${shadows}
    ${evening}
    float glowPool(vec2 p,vec2 light,float radius){
      vec2 d=(p-light)/radius;
      float fall=max(0.,1.-dot(d,d));
      return fall*fall*fall;
    }
    void main(){
      vec2 p=vPoint.xz;
      vec2 uv=p/(2.*uRadius)+.5;
      if(uMaterial<.5){
        float r=length(p);
        float a=mod(atan(p.x,p.y)-uStart+6.283185307,6.283185307);
        float sm=min(a,6.283185307-a), endDist=abs(a-uAngle);
        float opened=uAngle>6.2830?1.:1.-smoothstep(.014,.21,min(sm,a<=uAngle?0.:endDist));
        float blur=1.-smoothstep(uRadius*.86,uRadius*1.18,r);
        gl_FragColor=vec4(.43,.37,.286,.17*blur*opened);
      }else if(uMaterial<1.5){
        float stripe=.55+.28*cos((vPoint.y+.22)*90.);
        float light=.88+.12*sin(atan(p.x,p.y)+uViewLight+.55);
        vec3 edge=mix(vec3(.685,.577,.430),vec3(.91,.837,.649),stripe);
        gl_FragColor=vec4(twilight(edge*light,.50),1.);
      }else if(uMaterial<2.5){
        float bearing=mod(atan(p.x,p.y)-uStart+6.283185307,6.283185307);
        float toFold=clamp(uAngle-bearing,0.,6.2832);
        float opened=mix(smoothstep(.047,.30,toFold),1.,smoothstep(6.07,6.2830,uAngle));
        vec3 sketch=texture2D(uPlan,uv).rgb, land=texture2D(uLand,uv).rgb;
        float depthAge=min(bearing,toFold);
        float shading=.14*exp(-depthAge*8.5)*clamp(length(p)*.42,0.,1.)*(1.-smoothstep(5.73,6.283,uAngle));
        float hingeLight=clamp(vPoint.y,0.,.48)*.14;
        vec3 ground=mix(sketch,land,opened);
        float facet=.5+.5*cos(bearing*24.);
        float seal=(1.-smoothstep(.015,.12,toFold))*sqrt(min(1.,length(p)/3.));
        ground*=1.+(.023+seal*.10)*(facet-.5);
        float castShadow=shadeAt(vLighting,.0026)*(.255+.028*opened);
        vec3 base=twilight(ground*(1.-shading+hingeLight-castShadow),.44);
        float pools=dot(uLampState,vec3(glowPool(p,vec2(-1.73,4.03),1.00),glowPool(p,vec2(1.55,4.00),.84),glowPool(p,vec2(-3.36,-2.82),.64)));
        float warm=smoothstep(.36,.92,uDusk)*pools;
        gl_FragColor=vec4(base+vec3(.28,.16,.049)*warm,1.);
      }else if(uMaterial<5.5){
        vec3 print=uMaterial<3.5?texture2D(uLeft,vUV).rgb:
          uMaterial<4.5?texture2D(uRight,vUV).rgb:texture2D(uCover,vUV).rgb;
        float gloss=.065*exp(-pow((vUV.x-.44)*2.8,2.));
        float fiber=.008*sin(vUV.y*646.)*sin(vUV.x*831.);
        gl_FragColor=vec4(mix(print,twilight(print,.65),.70)*(uLeafLight+gloss+fiber),1.);
      }else{
        float glow=.88+.12*vUV.y;
        vec3 edge=uMaterial<6.5?vec3(.84,.746,.55):vec3(.69,.58,.424);
        gl_FragColor=vec4(edge*glow,1.);
      }
    }`,["aPoint","aUV"]);
  function uniforms(p,keys){return Object.fromEntries(keys.map(s=>[s,gl.getUniformLocation(p,s)]));}
  const model=uniforms(scenery,["uFrame","uView","uCenter","uAngle","uTime","uShadowPass","uShadow","uWind","uSpin","uBirdPos","uBirdPose","uAwning","uDusk","uCatRoot","uCatGait","uCatLook"]);
  const ground=uniforms(paper,["uFrame","uView","uCenter","uPlan","uLand","uLeft","uRight","uCover","uAngle","uStart","uRadius","uMaterial","uViewLight","uLeafLight","uShadow","uDusk","uBearing","uFacing","uPacking"]);
  model.uLampState=gl.getUniformLocation(scenery,"uLampState");
  ground.uLampState=gl.getUniformLocation(paper,"uLampState");
  function buffer(data){
    const id=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,id);
    if(data)gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    return id;
  }
  const background=program(`
    attribute vec2 aPoint;
    varying vec2 vPos;
    void main(){vPos=aPoint*.5+.5;gl_Position=vec4(aPoint,.999,1.);}
  `,`
    precision highp float;
    varying vec2 vPos;
    uniform float uDusk,uAspect;
    void main(){
      vec2 p=vPos;
      float fall=clamp(length((p-vec2(.39,.72))*vec2(uAspect*.91,.92)),0.,1.);
      vec3 day=mix(vec3(.993,.968,.885),vec3(.775,.823,.749),smoothstep(.05,1.07,fall));
      float diagonal=smoothstep(-.10,.72,p.x*.46-p.y*.69+.33);
      vec3 late=mix(vec3(.94,.78,.66),vec3(.44,.52,.62),smoothstep(.02,.95,fall)*.61+diagonal*.34);
      float paper=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
      gl_FragColor=vec4(mix(day,late,uDusk)+paper*.006,1.);
    }
  `,["aPoint"]);
  const backdrop=buffer(new Float32Array([-1,-1,3,-1,-1,3]));
  const sky=uniforms(background,["uDusk","uAspect"]);
  function texture(canvas,slot){
    gl.activeTexture(gl.TEXTURE0+slot);
    gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const mip=slot<2;
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,mip?gl.LINEAR_MIPMAP_LINEAR:gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    if(mip)gl.generateMipmap(gl.TEXTURE_2D);
  }
  const {vertices,batches,lampTimings}=TurningGarden.build(),objectBuffer=buffer(vertices);
  texture(TurningGarden.groundArt(true),0);texture(TurningGarden.groundArt(false),1);
  for(let i=0;i<3;i++)texture(GardenPages.produce(i),i+2);
  function shadowTarget(){
    const dim=1024, framebuffer=gl.createFramebuffer(), depth=gl.createRenderbuffer();
    const texture=gl.createTexture(), blank=gl.createTexture();
    gl.activeTexture(gl.TEXTURE5);
    for(const [image,side,color] of [[texture,dim,null],[blank,1,new Uint8Array([255,0,0,255])]]){
      gl.bindTexture(gl.TEXTURE_2D,image);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,side,side,0,gl.RGBA,gl.UNSIGNED_BYTE,color);
      for(const axis of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,axis,gl.NEAREST);
      for(const axis of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,axis,gl.CLAMP_TO_EDGE);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
    gl.bindRenderbuffer(gl.RENDERBUFFER,depth);
    gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,dim,dim);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
    const ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    return {dim,framebuffer,texture,blank,ok};
  }
  const lightmap=shadowTarget();
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0,0,0,0);

  const point=(r,y,a,u=0,v=0)=>[r*Math.sin(a),y,r*Math.cos(a),u,v];
  function quad(data,a,b,c,d){data.push(...a,...b,...c,...a,...c,...d);}
  function packingAt(cursor){return ease((cursor-326)/33);}
  // One immutable mesh for both pages and the radial pleats. The vertex
  // shader deforms it for the current opening, so dragging needs no uploads.
  function paperGeometry(){
    const data=[],parts=[];
    function layer(material,write,facing=0,sideName=""){
      const first=data.length/5;
      write();
      parts.push({material,first,count:data.length/5-first,facing,sideName});
    }
    layer(0,()=>{
      for(let i=0;i<48;i++)data.push(0,-.255,0,0,0,...point(radius*1.18,-.255,tau*i/48),...point(radius*1.18,-.255,tau*(i+1)/48));
    });
    const radial=(r,a,y=0)=>[r,y,radians(a),0,0];
    for(const material of [1,2])layer(material,()=>{
      for(let i=0;i<144;i++){
        const a=i*2.5,b=a+2.5;
        if(material===1)quad(data,radial(radius,a),radial(radius,b),radial(radius,b,-.214),radial(radius,a,-.214));
        else data.push(...radial(0,a),...radial(radius,a),...radial(radius,b));
      }
    },0,"fan");
    layer(1,()=>{
      for(const a of [0,360])quad(data,radial(0,a),radial(radius,a),radial(radius,a,-.214),radial(0,a,-.214));
    },0,"caps");
    function panelPoint(u,v,side){return [u,side,v,u,1-v];}
    for(const facing of [1,-1]){
      for(const [material,side] of [[facing>0?3:4,facing],[5,-facing]])layer(material,()=>{
        for(let i=0;i<14;i++)for(let j=0;j<8;j++){
          const a=i/14,b=(i+1)/14,h=j/8,k=(j+1)/8;
          quad(data,panelPoint(a,h,side),panelPoint(b,h,side),panelPoint(b,k,side),panelPoint(a,k,side));
        }
      },facing,"sheet");
      layer(6,()=>{
        for(const v of [0,1])for(let j=0;j<14;j++){
          const l=j/14,r=(j+1)/14;
          quad(data,panelPoint(l,v,-facing),panelPoint(r,v,-facing),panelPoint(r,v,facing),panelPoint(l,v,facing));
        }
        for(let j=0;j<8;j++){
          const a=j/8,b=(j+1)/8;
          quad(data,panelPoint(1,a,-facing),panelPoint(1,b,-facing),panelPoint(1,b,facing),panelPoint(1,a,facing));
        }
      },facing,"sheet");
    }
    layer(7,()=>{
      for(let i=0;i<10;i++){
        const a=tau*i/10,b=tau*(i+1)/10;
        quad(data,point(.028,0,a),point(.028,0,b),point(.028,1,b),point(.028,1,a));
      }
    });
    return {paperBuffer:buffer(new Float32Array(data)),paperParts:parts};
  }
  const {paperBuffer,paperParts}=paperGeometry();
  function framing(width,height,cursor){
    const packing=packingAt(cursor);
    const pitch=.504+.084*Math.sin(Math.PI*cursor/360)**2+.116*ease((cursor-233)/127)+tilt;
    const yaw=-start-radians(cursor)*.5-.83*(1-ease(cursor/104))-.345*ease((cursor-271)/89)+orbit;
    const points=[point(0,0,0),point(0,leafHeight*(1-packing),0)];
    for(const a of [0,cursor])points.push(point(radius,(leafHeight-.22)*(1-packing),start+radians(a)));
    for(let j=0;j<=32;j++)points.push(point(radius,-.215,start+radians(cursor*j/32)));
    const glimpse=ease((cursor-150)/41);
    points.push([-1.25,3.42,1.45].map(v=>glimpse*v),[1.0,2.89,2.17].map(v=>glimpse*v));
    const xx=points.map(([x,y,z])=>x*Math.cos(yaw)+z*Math.sin(yaw));
    const yy=points.map(([x,y,z])=>y*Math.cos(pitch)-(z*Math.cos(yaw)-x*Math.sin(yaw))*Math.sin(pitch));
    const x0=Math.min(...xx),x1=Math.max(...xx),y0=Math.min(...yy),y1=Math.max(...yy);
    const opening=ease(cursor/95);
    const viewWidth=Math.max(6.82+1.25*opening,x1-x0)+(width<610?1.10:1.84-.77*packing);
    const viewHeight=Math.max(6.32+1.18*opening-.97*packing,y1-y0)+1.04;
    const zoom=Math.min(width/viewWidth,height/viewHeight)*magnification*(1+focusWeight*.28);
    let centerX=width*.5-(x0+x1)*zoom*.5,centerY=height*.51+(y0+y1)*zoom*.5;
    if(focusWeight>0&&focusPoint){
      const [x,y,z]=focusPoint,c=Math.cos(yaw),s=Math.sin(yaw);
      const subjectX=centerX+(x*c+z*s)*zoom;
      const subjectY=centerY+(Math.sin(pitch)*(z*c-x*s)-y*Math.cos(pitch))*zoom;
      centerX+=(width*.45-subjectX)*focusWeight*.74;
      centerY+=(height*.60-subjectY)*focusWeight*.80;
      if(flightPoint&&!catCloseup){
        const [bx,by,bz]=flightPoint;
        const birdY=centerY+(Math.sin(pitch)*(bz*c-bx*s)-by*Math.cos(pitch))*zoom;
        centerY+=Math.max(0,height*.058-birdY)*ease(focusWeight/.14);
      }
    }
    return {yaw,pitch,zoom,centerX,centerY};
  }
  function drawModel(cursor,seconds,pass,life,count){
    gl.useProgram(scenery);gl.bindBuffer(gl.ARRAY_BUFFER,objectBuffer);
    let offset=0;
    [3,3,3,4,4].forEach((components,index)=>{
      gl.enableVertexAttribArray(index);
      gl.vertexAttribPointer(index,components,gl.FLOAT,false,68,offset*4);
      offset+=components;
    });
    gl.uniform1f(model.uAngle,cursor);gl.uniform1f(model.uTime,seconds);
    gl.uniform1f(model.uWind,life.wind);gl.uniform1f(model.uSpin,life.spin);
    gl.uniform1f(model.uAwning,life.awning);
    gl.uniform1f(model.uDusk,dusk);
    gl.uniform3fv(model.uLampState,life.lamps);
    gl.uniform4fv(model.uCatRoot,life.cat.root);gl.uniform4fv(model.uCatGait,life.cat.gait);gl.uniform4fv(model.uCatLook,life.cat.look);
    gl.uniform3fv(model.uBirdPos,life.bird.pos);gl.uniform4fv(model.uBirdPose,life.bird.pose);
    gl.uniform1f(model.uShadowPass,pass);gl.uniform1i(model.uShadow,5);
    gl.drawArrays(gl.TRIANGLES,0,count);
  }
  let lastLife=null;
  function spinKick(age){
    const x=Math.max(0,age)*1.85;
    return 8.0*(1-(1+x)*Math.exp(-x));
  }
  function draw(cursor){
    const density=exportMode?1:Math.min(1.5,devicePixelRatio);
    const w=Math.round(canvas.clientWidth*density),h=Math.round(canvas.clientHeight*density);
    if(!w||!h)return;
    if(w!==canvas.width||h!==canvas.height){canvas.width=w;canvas.height=h;}
    const seconds=clock;
    const life={wind:GardenLife.breeze(seconds)+1.22*GardenLife.pulse(gustAge,.29,1.07),
      awning:awning+(1-awning)*.20*GardenLife.pulse(gustAge-.16,.46,.64),
      spin:GardenLife.spinAt(seconds)+extraSpin+spinKick(gustAge),
      bird:GardenLife.birdPose(cursor,seconds,angleRate,callAge),
      cat:GardenCat.pose(cursor,seconds,catAge,angleRate),
      lamps:lampTimings.map(({at,span})=>ease((cursor-at)/(.45*span)))};
    lastLife=life;
    focusPoint=life.cat.point;flightPoint=life.bird.pos;
    focusWeight=life.cat.visible&&!manualAction?ease(catAge/.44)*(1-ease((catAge-.76)/.86))*(catCloseup?.92:.32):0;
    const {yaw,pitch,zoom,centerX,centerY}=framing(canvas.clientWidth,canvas.clientHeight,cursor);
    const scale=[2*zoom/canvas.clientWidth,2*zoom/canvas.clientHeight];
    const view=[yaw,pitch];
    const center=[centerX/canvas.clientWidth*2-1,1-centerY/canvas.clientHeight*2];
    let count=0;
    for(const batch of batches){if(batch.at>cursor)break;count=batch.end;}
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D,lightmap.blank);
    if(lightmap.ok&&cursor>10){
      gl.bindFramebuffer(gl.FRAMEBUFFER,lightmap.framebuffer);
      gl.viewport(0,0,lightmap.dim,lightmap.dim);
      gl.clearColor(1,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      drawModel(cursor,seconds,1,life,count);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      gl.bindTexture(gl.TEXTURE_2D,lightmap.texture);
    }
    gl.clearColor(0,0,0,0);
    gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(background);
    for(let i=1;i<5;i++)gl.disableVertexAttribArray(i);
    gl.bindBuffer(gl.ARRAY_BUFFER,backdrop);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    gl.uniform1f(sky.uDusk,dusk);gl.uniform1f(sky.uAspect,w/h);
    gl.depthMask(false);gl.drawArrays(gl.TRIANGLES,0,3);gl.depthMask(true);
    gl.useProgram(paper);
    gl.uniform2fv(ground.uFrame,scale);gl.uniform2fv(ground.uView,view);gl.uniform2fv(ground.uCenter,center);
    gl.uniform1i(ground.uPlan,0);gl.uniform1i(ground.uLand,1);
    gl.uniform1i(ground.uLeft,2);gl.uniform1i(ground.uRight,3);gl.uniform1i(ground.uCover,4);
    gl.uniform1i(ground.uShadow,5);
    gl.uniform1f(ground.uDusk,dusk);
    gl.uniform3fv(ground.uLampState,life.lamps);
    gl.uniform1f(ground.uStart,start);gl.uniform1f(ground.uRadius,radius);
    gl.uniform1f(ground.uAngle,radians(cursor));gl.uniform1f(ground.uViewLight,yaw);
    for(let i=1;i<5;i++)gl.disableVertexAttribArray(i);
    gl.enableVertexAttribArray(0);gl.enableVertexAttribArray(1);
    gl.bindBuffer(gl.ARRAY_BUFFER,paperBuffer);
    gl.vertexAttribPointer(0,3,gl.FLOAT,false,20,0);gl.vertexAttribPointer(1,2,gl.FLOAT,false,20,12);
    const packing=packingAt(cursor);
    const moving=start+radians(cursor+1.34*(1-ease(Math.min(cursor,360-cursor)/9)));
    const sectors=Math.ceil(cursor/2.5);
    gl.uniform1f(ground.uPacking,packing);
    for(const {first,count,material,facing,sideName} of paperParts){
      if(material>=3&&packing>.99999)continue;
      if(sideName==="caps"&&cursor>=359.99)continue;
      if(material===0){gl.enable(gl.BLEND);gl.depthMask(false);}
      if(material===1){gl.disable(gl.BLEND);gl.depthMask(true);}
      const bearing=facing<0?moving:start;
      const sun=(-.52*Math.cos(bearing+yaw)-.48*Math.sin(bearing+yaw))*facing;
      const light=material===5?.86-.108*sun:facing?.87+.115*sun:1;
      gl.uniform1f(ground.uMaterial,material);
      gl.uniform1f(ground.uFacing,facing);gl.uniform1f(ground.uBearing,bearing);
      gl.uniform1f(ground.uLeafLight,light);
      const active=sideName==="fan"?sectors*(material===1?6:3):count;
      gl.drawArrays(gl.TRIANGLES,first,active);
    }
    gl.useProgram(scenery);
    gl.uniform2fv(model.uFrame,scale);gl.uniform2fv(model.uView,view);gl.uniform2fv(model.uCenter,center);
    drawModel(cursor,seconds,0,life,count);
  }

  const windButton=$("gust"),birdButton=$("flight"),orbitButton=$("orbit"),awningButton=$("awning");
  const catButton=$("cat-call"),lightButton=$("lamps");
  const sound=$("sound"),voices=new Set();
  function foley(index){
    if(exportMode||!sound.checked)return;
    if(voices.size>=3){const first=voices.values().next().value;first.pause();voices.delete(first);}
    const audio=new Audio(index===4?"paw-foley.m4a":"touch-foley.m4a");voices.add(audio);
    audio.volume=.76;audio.currentTime=index===4?0:index;
    audio.onended=()=>voices.delete(audio);
    audio.onplaying=()=>setTimeout(()=>{audio.pause();voices.delete(audio);},940);
    audio.play().catch(()=>voices.delete(audio));
  }
  sound.onchange=()=>{
    if(sound.checked)foley(0);
    else {for(const voice of voices)voice.pause();voices.clear();}
  };
  let lastRounded=-1;
  function lightLabel(){
    const isDusk=(lightOverride??dusk)>.5;
    lightButton.setAttribute("aria-pressed",String(isDusk));
    lightButton.textContent=isDusk?"切到日光":"切到黄昏";
  }
  function display(){
    const rounded=Math.round(angle);
    if(lastRounded!==rounded){
      lastRounded=rounded;
      range.value=String(rounded);
      range.setAttribute("aria-valuetext",rounded+" 度");
      readout.value=String(rounded).padStart(3,"0")+"°";
    }
    windButton.disabled=angle<28;birdButton.disabled=angle<16;
    awningButton.disabled=angle<337;
    catButton.disabled=angle<63;
    const label=playing?"暂停展开":angle>=359.999?"重新展开":"播放展开";
    if(play.textContent!==label){play.textContent=label;play.setAttribute("aria-label",label);}
  }
  function go(value){
    playing=false;
    angle=clamp(value,0,360);playhead=GardenLife.timeAt(angle);angleRate=0;
    settledTime=angle===360?1.4:0;
    if(lightOverride===null){dusk=GardenLamps.grade(playhead+settledTime);lightLabel();}
    display();draw(angle);
  }
  function wind(){
    if(windButton.disabled)return;
    extraSpin+=spinKick(gustAge);gustAge=0;frozen=false;
    foley(0);
    $("status").textContent="一阵风拂过庭院";
  }
  function fly(){
    if(birdButton.disabled)return;
    callAge=0;frozen=false;
    foley(1);
    $("status").textContent="纸燕借风向上飞";
  }
  function coaxCat(){
    if(catButton.disabled)return;
    catAge=0;catCloseup=true;frozen=false;foley(4);
    $("status").textContent="橘猫压低身子，扑向纸蝶";
  }
  function toggleLight(){
    lightOverride=(lightOverride??dusk)>.5?0:1;
    lightLabel();
  }
  function setOrbitMode(on){
    orbitMode=on;orbitButton.setAttribute("aria-pressed",String(on));
    orbitButton.classList.toggle("selected",on);
  }
  function foldAwning(){
    if(awningButton.disabled)return;
    awningTarget=1-awningTarget;
    awningButton.textContent=awningTarget?"放下布棚":"收起布棚";
    foley(2);
    frozen=false;
  }
  function resetView(){
    orbitTarget=0;tiltTarget=0;zoomTarget=1;manualAction=false;
  }
  function autoplay(){
    if(playing){playing=false;angleRate=0;display();return;}
    if(angle>=359.999){
      angle=0;playhead=clock=extraSpin=dusk=settledTime=0;gustAge=callAge=catAge=-Infinity;catCloseup=false;lightOverride=null;lightLabel();
      orbit=tilt=awning=awningTarget=0;awningButton.textContent="收起布棚";magnification=1;resetView();setOrbitMode(false);
    }
    playing=true;frozen=false;display();
    foley(3);
  }
  // The autoplay and export trace the same ten-second fold, then the wind
  // carries on independently. Seeking does not rewind a gust or a wingbeat.
  function signatureView(t){return .164*ease((t-8.65)/3.35);}
  function renderAt(t){
    playing=false;
    clock=Math.max(0,t);playhead=Math.min(GardenLife.opening,clock);
    angle=GardenLife.angleAt(clock);
    angleRate=(GardenLife.angleAt(clock+.009)-GardenLife.angleAt(clock-.009))/.018;
    gustAge=clock-9.28;callAge=clock-10.48;catAge=clock-10.48;extraSpin=0;
    settledTime=Math.max(0,clock-GardenLife.opening);catCloseup=false;manualAction=false;lightOverride=null;dusk=GardenLamps.grade(clock);lightLabel();
    tilt=awning=awningTarget=0;orbit=signatureView(clock);magnification=1;
    orbitTarget=orbit;tiltTarget=0;zoomTarget=1;
    draw(angle);display();
  }
  function project(p){
    const v=framing(canvas.clientWidth,canvas.clientHeight,angle);
    const [x,y,z]=p,c=Math.cos(v.yaw),s=Math.sin(v.yaw);
    return [v.centerX+(c*x+s*z)*v.zoom,
      v.centerY-(y*Math.cos(v.pitch)-(c*z-s*x)*Math.sin(v.pitch))*v.zoom];
  }
  function inspect(){
    const view=framing(canvas.clientWidth,canvas.clientHeight,angle);
    return {...view,angle,clock,playing,radius,pageHeight:leafHeight*(1-packingAt(angle)),
      shadows:lightmap.ok,wind:lastLife?.wind,spin:lastLife?.spin,gustAge,callAge,catAge,dusk,
      cat:lastLife?.cat.visible?project(lastLife.cat.point):null,gate:project(GardenLamps.gate),
      wheel:project(GardenLife.wheel),bird:lastLife?project(lastLife.bird.pos):null,magnification,orbit,awning};
  }
  window.circularFold={duration,setAngle:go,inspect};
  window.renderAt=renderAt;
  function tick(now){
    const dt=lastTick?clamp((now-lastTick)/1000,0,.16):0;
    lastTick=now;
    if(document.hidden)return;
    const alive=!frozen;
    if(alive){clock+=dt;gustAge+=dt;callAge+=dt;catAge+=dt;if(angle>=359.999&&!playing)settledTime+=dt;}
    if(playing){
      const before=playhead;
      playhead=Math.min(GardenLife.opening,playhead+dt);
      angle=GardenLife.angleAt(playhead);
      angleRate=(GardenLife.angleAt(playhead+.009)-GardenLife.angleAt(playhead-.009))/.018;
      if(before<9.28&&playhead>=9.28)wind();
      if(playhead>=GardenLife.opening){playing=false;catCloseup=false;callAge=catAge=-.48;angleRate=0;}
      display();
    }else if(drag)angleRate=dragRate;
    else angleRate*=Math.exp(-dt*14);
    if(!manualAction&&angle>=300&&!drag)orbitTarget=signatureView(clock);
    const k=1-Math.exp(-dt*15);
    const targetLight=lightOverride??GardenLamps.grade(playhead+(angle>=359.999?settledTime:0));
    const relighting=Math.abs(dusk-targetLight)>.0001;
    const oldDusk=dusk;
    if(lightOverride===null&&playing)dusk=targetLight;
    else if(relighting)dusk+=(targetLight-dusk)*(1-Math.exp(-dt*4.5));
    if((oldDusk>.5)!==(dusk>.5))lightLabel();
    awning+=(awningTarget-awning)*(1-Math.exp(-dt*5.1));
    const shifting=Math.abs(orbitTarget-orbit)+Math.abs(tiltTarget-tilt)+Math.abs(zoomTarget-magnification)>.00002;
    orbit+=(orbitTarget-orbit)*k;tilt+=(tiltTarget-tilt)*k;magnification+=(zoomTarget-magnification)*k;
    if(alive||playing||shifting||relighting)draw(angle);
    animationFrame=requestAnimationFrame(tick);
  }
  function radialPoint(x,y,view){
    const dx=x-view.centerX,dz=(y-view.centerY)/Math.sin(view.pitch);
    return {distance:Math.hypot(dx,dz),bearing:Math.atan2(dx,-dz)};
  }
  const pointers=new Map();
  let pinch=null;
  const pairDistance=()=>{const [a,b]=pointers.values();return Math.hypot(a.x-b.x,a.y-b.y);};
  function hit(x,y){
    const spots=[];
    if(!birdButton.disabled&&lastLife)spots.push([project(lastLife.bird.pos),fly,.59]);
    if(!catButton.disabled&&lastLife?.cat.visible)spots.push([project(lastLife.cat.point),coaxCat,.51]);
    for(const [i,p] of GardenLamps.lamps.entries()){
      if(lastLife?.lamps[i]>.8)spots.push([project(p),toggleLight,.33]);
    }
    if(angle>252)spots.push([project(GardenLife.wheel),wind,.61]);
    if(!awningButton.disabled)spots.push([project([.72,1.70+.33*awning,3.53-.58*awning]),foldAwning,.65]);
    if(angle>286)spots.push([project([3.13,1.88,.36]),wind,.70]);
    const zoom=framing(canvas.clientWidth,canvas.clientHeight,angle).zoom;
    for(const [[cx,cy],action,r] of spots)if(Math.hypot(x-cx,y-cy)<Math.max(15,r*zoom))return action;
    return null;
  }
  function viewportPoint(e){
    const r=canvas.getBoundingClientRect();
    return {x:e.clientX-r.left,y:e.clientY-r.top};
  }
  function moveView(dx,dy,original){
    manualAction=true;
    orbitTarget=original.yaw+dx/canvas.clientWidth*3.8;
    tiltTarget=clamp(original.tilt+dy/canvas.clientHeight*1.12,-.20,.40);
  }
  canvas.addEventListener("pointerdown",e=>{
    if(e.button!==0)return;
    const p=viewportPoint(e);
    canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,p);
    if(pointers.size===2){
      drag=null;pinch={distance:Math.max(1,pairDistance()),zoom:zoomTarget};return;
    }
    const view=framing(canvas.clientWidth,canvas.clientHeight,angle);
    const {distance,bearing}=radialPoint(p.x,p.y,view),edge=radius*view.zoom;
    const radial=!orbitMode&&angle>=18&&distance>edge*.81&&distance<edge*1.13;
    drag={id:e.pointerId,start:p,angle,view,radial,bearing,action:hit(p.x,p.y),moved:false,
      orbit:!radial&&(orbitMode||angle>=359.999),yaw:orbitTarget,tilt:tiltTarget,when:performance.now()};
    dragRate=0;
  });
  canvas.addEventListener("pointermove",e=>{
    const p=viewportPoint(e);
    if(!pointers.has(e.pointerId)){
      canvas.style.cursor=hit(p.x,p.y)?"pointer":"grab";return;
    }
    pointers.set(e.pointerId,p);
    if(pinch&&pointers.size===2){
      zoomTarget=clamp(pinch.zoom*pairDistance()/pinch.distance,.79,1.65);manualAction=true;return;
    }
    if(drag?.id!==e.pointerId)return;
    const dx=p.x-drag.start.x,dy=p.y-drag.start.y;
    if(!drag.moved&&Math.hypot(dx,dy)<5)return;
    drag.moved=true;
    if(drag.orbit){moveView(dx,dy,drag);return;}
    const prev=angle;
    if(drag.radial){
      const {distance,bearing}=radialPoint(p.x,p.y,drag.view);
      if(distance<20)return;
      const d=bearing-drag.bearing;angle=clamp(angle+Math.atan2(Math.sin(d),Math.cos(d))*180/Math.PI,0,360);
      drag.bearing=bearing;
    }else angle=clamp(drag.angle+360*dx/Math.min(680,canvas.clientWidth*.78),0,360);
    const now=performance.now();
    dragRate=clamp((angle-prev)*1000/Math.max(12,now-drag.when),-120,120);
    drag.when=now;playing=false;playhead=GardenLife.timeAt(angle);settledTime=0;display();
    if(frozen)draw(angle);
  });
  function release(e){
    if(!pointers.has(e.pointerId))return;
    pointers.delete(e.pointerId);
    if(pinch){if(!pointers.size)pinch=null;drag=null;return;}
    if(drag?.id!==e.pointerId)return;
    if(e.type==="pointerup"&&!drag.moved&&drag.action)drag.action();
    drag=null;dragRate=0;
  }
  for(const type of ["pointerup","pointercancel","lostpointercapture"])canvas.addEventListener(type,release);
  canvas.addEventListener("wheel",e=>{
    e.preventDefault();manualAction=true;
    zoomTarget=clamp(zoomTarget*Math.exp(-clamp(e.deltaY*(e.deltaMode===1?16:1),-150,150)*.0019),.79,1.65);
  },{passive:false});
  canvas.addEventListener("dblclick",resetView);
  canvas.addEventListener("keydown",e=>{
    if(e.key===" "){e.preventDefault();autoplay();return;}
    const targets={ArrowLeft:angle-5,ArrowRight:angle+5,Home:0,End:360};
    if(Object.hasOwn(targets,e.key)){e.preventDefault();go(targets[e.key]);return;}
    if(e.key==="Escape")resetView();
  });
  play.onclick=autoplay;windButton.onclick=wind;birdButton.onclick=fly;awningButton.onclick=foldAwning;
  catButton.onclick=coaxCat;lightButton.onclick=toggleLight;
  orbitButton.onclick=()=>setOrbitMode(!orbitMode);
  $("reset").onclick=resetView;
  range.addEventListener("input",()=>go(Number(range.value)));
  reduced.addEventListener("change",()=>{frozen=reduced.matches;if(frozen){playing=false;display();}});
  new ResizeObserver(()=>draw(angle)).observe(canvas);
  if(exportMode){renderAt(0);return;}
  if(reduced.matches)go(360);else autoplay();
  document.addEventListener("visibilitychange",()=>{
    cancelAnimationFrame(animationFrame);
    if(!document.hidden){lastTick=0;animationFrame=requestAnimationFrame(tick);}
  });
  animationFrame=requestAnimationFrame(tick);
})();
