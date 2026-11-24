"use strict";

globalThis.TurningGarden = (() => {
  const radius=5.42, tau=2*Math.PI, start=208*Math.PI/180;
  const estateOrigin=[-.85,1.95],estateScale=.84;
  const estate=([x,y,z])=>[estateOrigin[0]+estateScale*x,estateScale*y,estateOrigin[1]+estateScale*z];
  const gardens=[[-3.74,-2.44,1.35,1.56],[-4.18,-.54,1.38,1.52],[-4.12,1.33,1.32,1.30]];
  const colors=new Map();
  const ink="#514034", cream="#eadabd", wood="#936741", darkWood="#694634";
  const red=["#b85948","#c36550","#d37459","#bc5b4b","#d78163","#a95447","#ca6851"];
  const blues=["#305f77","#356780","#3f7591","#55869c"];
  const stone=["#a5afa2","#b7b7a2","#bdbdaa","#aeb1a3","#97a497"];
  const leaf=["#759467","#57795b","#89a768","#a9b277","#416d54","#729766"];
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  function angle(x,z){
    return ((Math.atan2(x,z)-start+tau*2)%tau)*180/Math.PI;
  }
  function rgb(hex){
    if(!colors.has(hex))colors.set(hex,[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255));
    return colors.get(hex);
  }
  const hex=channels=>"#"+channels.map(v=>Math.round(clamp(v,0,1)*255).toString(16).padStart(2,"0")).join("");
  const tint=(a,b,m)=>hex(rgb(a).map((v,i)=>v+(rgb(b)[i]-v)*m));
  const random=(key)=>{
    const value=Math.sin(827.45+key*78.233)*43758.5453;
    return value-Math.floor(value);
  };
  function normal(a,b,c){
    const [x,y,z]=b.map((v,i)=>v-a[i]),[u,v,w]=c.map((v,i)=>v-a[i]);
    const cross=[y*w-z*v,z*u-x*w,x*v-y*u],len=Math.hypot(...cross)||1;
    return cross.map(v=>v/len);
  }
  function mesh(destination, pivot=[0,0,0], release=0, duration=16, mode=0, hinge=0, flutter=0){
    function face(points,color,vertical=false,emissive=false){
      let n=normal(points[0],points[1],points[2]);
      if(vertical&&n[1]<0)n=n.map(v=>-v);
      const paint=rgb(color);
      const attr=[...n,emissive?-paint[0]-1:paint[0],paint[1],paint[2],...pivot,hinge,release,duration,mode,flutter];
      function emit(index){
        const p=points[index]; destination.push(p[0],p[1],p[2],...attr);
      }
      for(let i=1;i+1<points.length;i++){emit(0);emit(i);emit(i+1);}
    }
    function box(x,y,z,w,h,d,c){
      const a=[x,y,z],b=[x+w,y,z],e=[x,y,z+d],f=[x+w,y,z+d];
      const A=[x,y+h,z],B=[x+w,y+h,z],E=[x,y+h,z+d],F=[x+w,y+h,z+d];
      face([A,E,F,B],c);face([e,f,F,E],c);face([a,A,B,b],c);
      face([a,e,E,A],c);face([b,B,F,f],c);
    }
    function beam(a,b,width,depth,color){
      const dir=b.map((x,i)=>x-a[i]), k=Math.hypot(...dir);
      if(k<.000001)return;
      const n=dir.map(x=>x/k), cross=Math.abs(n[1])>.94?[1,0,0]:[-n[2],0,n[0]];
      const l=Math.hypot(...cross), h=cross.map(x=>x/l);
      const q=[n[1]*h[2]-n[2]*h[1],n[2]*h[0]-n[0]*h[2],n[0]*h[1]-n[1]*h[0]];
      const ends=[a,b].map(p=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([i,j])=>p.map((x,d)=>x+i*h[d]*width*.5+j*q[d]*depth*.5)));
      for(let j=0;j<4;j++){
        const k=(j+1)%4;
        face([ends[0][j],ends[1][j],ends[1][k],ends[0][k]],color);
      }
      face(ends[0],color);face([...ends[1]].reverse(),color);
    }
    function lathe(x,y,z,rings,paint,segments=10){
      const points=rings.map(([h,r])=>Array.from({length:segments},(_,i)=>[
        x+r*Math.cos(tau*i/segments),y+h,z+r*Math.sin(tau*i/segments)
      ]));
      for(let j=0;j<points.length-1;j++)for(let i=0;i<segments;i++){
        const k=(i+1)%segments,c=Array.isArray(paint)?paint[(j+i)%paint.length]:paint;
        face([points[j][i],points[j+1][i],points[j+1][k],points[j][k]],c);
      }
      return points.at(-1);
    }
    return {face,box,beam,lathe};
  }

  function facade(m, front, xFn, length, floor, ceiling, variant){
    const at=(s,y,bias=0)=>xFn(s,y,bias), wall=[cream,"#d9bd91","#e0c79e"][variant];
    const width=.092, middle=floor+(ceiling-floor)*.49;
    for(let i=0;i<7;i++){
      const y=floor+(ceiling-floor)*i/7,h=(ceiling-floor)/7;
      m.face([at(0,y),at(length,y),at(length,y+h),at(0,y+h)],i%3===0?tint(wall,"#c2a87e",.15):wall);
    }
    const board=(x0,y0,x1,y1,w=width,c=wood)=>{
      m.beam(at(x0,y0,.043),at(x1,y1,.043),w,w,c);
      const grain=tint(c,"#ce9a63",.34);
      const d=w*.23, xShift=Math.abs(x1-x0)>.08?0:d, yShift=xShift?0:d;
      m.beam(at(x0+xShift,y0+yShift,.045+w*.47),at(x1+xShift,y1+yShift,.045+w*.47),.013,.009,grain);
    };
    for(const y of [floor+.045,middle,ceiling-.032])board(-.03,y,length+.03,y,.108,wood);
    const cols=front?4:3;
    for(let j=0;j<=cols;j++){
      const x=length*j/cols;
      board(x,floor,x,ceiling,.126,j===0||j===cols?darkWood:wood);
      if(j<cols){
        board(x+.045,floor+.107,x+length/cols-.04,middle-.063,.061);
        if(j%2||!front)board(x+length/cols-.04,middle+.061,x+.044,ceiling-.071,.061);
      }
    }
    for(let i=0;i<32;i++){
      const a=length*random(80+i), y=floor+(ceiling-floor)*random(912+i), b=Math.min(length,a+.035+.10*random(123+i));
      m.face([at(a,y,.008),at(b,y+.004,.008),at(b-.019,y+.023,.008),at(a+.011,y+.016,.008)],
        tint(wall,i%2?wood:"#fff0cd",.13+random(i+70)*.07));
    }
    return at;
  }
  function aperture(m,at,x,y,w,h,door=false,shutters=false){
    const from=(u,v,d=.119)=>at(x+u,y+v,d);
    const rect=(l,b,r,t,c,d,lit=false)=>m.face([from(l,b,d),from(r,b,d),from(r,t,d),from(l,t,d)],c,false,lit);
    const edge=(a,b,d,e,c,width,bias=.139)=>m.beam(from(a,b,bias),from(d,e,bias),width,width,c);
    rect(-.035,-.015,w+.035,h+.018,darkWood,.109);
    rect(.055,.043,w-.055,h-.058,door?"#956445":"#304745",.130);
    for(const [a,b,r,t] of [[0,0,0,h],[w,0,w,h],[-.035,h,w+.035,h],[-.017,0,w+.017,0]])edge(a,b,r,t,wood,.083);
    if(door){
      for(let j=1;j<5;j++)edge(j*w/5,.037,j*w/5,h-.055,j%2?"#b27b52":"#77503b",.015,.148);
      rect(.126,h*.53,w-.126,h*.88,"#3d5d5c",.153,true);
      rect(.153,h*.57,w*.46,h*.68,"#a2b9ac",.159);
      edge(w*.5,h*.53,w*.5,h*.89,wood,.023,.161);
      edge(.134,h*.702,w-.134,h*.702,wood,.024,.16);
      edge(w-.16,h*.44,w-.16,h*.38,"#d5a760",.034,.172);
      edge(.09,h*.21,w-.09,h*.21,"#764e36",.054,.165);
      edge(-.09,-.025,w+.09,-.025,"#b1a18b",.11,.190);
    }else{
      const panes=[["#617f7b","#4e7370"],["#456c6b","#82988a"]];
      for(let j=0;j<2;j++)for(let i=0;i<2;i++){
        const l=.068+i*(w*.50-.014),r=l+w*.48-.063;
        const b=.055+j*(h*.50-.015),t=b+h*.46-.038;
        rect(l,b,r,t,panes[j][i],.144,true);
        if((i+j)%2===0)m.face([from(l+.009,t-.024,.146),from(l+.039,t-.009,.146),from(r-.026,b+.035,.146),from(r-.056,b+.028,.146)],"#9eb6a5");
      }
      edge(w*.50,.046,w*.50,h-.032,"#b3784b",.035,.153);
      edge(.039,h*.50,w-.037,h*.50,"#b3784b",.036,.154);
      edge(.110,h*.79,w*.44,h*.92,"#b1bfa9",.012,.157);
      edge(-.083,-.041,w+.083,-.041,darkWood,.098,.187);
      edge(-.098,-.020,w+.098,-.020,"#b78c59",.047,.208);
      edge(-.078,h+.045,w+.078,h+.045,"#c79d6d",.044,.150);
    }
    if(shutters)for(const sign of [-1,1]){
      const hinge=sign<0?-.045:w+.045, reach=.263;
      const flap=(t,v)=>from(hinge+sign*t,v,.148+t*.59);
      m.face([flap(0,.0),flap(reach,0),flap(reach,h),flap(0,h)],"#a16b45");
      for(let j=1;j<=4;j++){
        const put=reach*j/5;
        m.beam(flap(put,.024),flap(put,h-.024),.013,.011,j%2?"#88613f":"#b88051");
      }
      for(const [a,b,c,d] of [[0,0,reach,0],[0,h,reach,h],[reach,0,reach,h],[.019,.024,reach-.02,h-.024],[.022,h-.03,reach-.02,.024]]){
        m.beam(flap(a,b),flap(c,d),.036,.030,"#c08a57");
      }
      for(const y0 of [.094,h-.083])m.beam(flap(-.014,y0),flap(.058,y0),.018,.017,"#605546");
    }
  }
  function foundation(m,x,z,w,d){
    m.box(x,.028,z,w,.526,d+.036,"#868b7c");
    m.box(x-.029,.022,z-.028,w+.057,.082,d+.057,"#a3a696");
    for(let j=0;j<3;j++){
      for(let i=0;i<Math.ceil(w/.38);i++){
        const left=x+i*.38+(j%2)*.13, size=Math.min(x+w-left,.366);
        if(size>.03){
          const c=stone[(i+2*j)%stone.length],bottom=.052+j*.162,right=left+size;
          const f=z+d+.038, edge=.023+random(i*59+j)*.014;
          m.face([[left+edge,bottom,f],[right-edge,bottom,f],[right,bottom+.038,f],[right-.007,bottom+.114,f],
            [right-edge,bottom+.150,f],[left+edge,bottom+.148,f],[left,bottom+.113,f],[left,bottom+.048,f]],c);
          m.face([[left+.012,bottom+.118,f],[left+edge,bottom+.148,f],[right-edge,bottom+.15,f],[right-.008,bottom+.121,f+ .001]],tint(c,"#e6dcc1",.28));
        }
        const behind=Math.min(x+w-left,.36);
        if(behind>.03)m.box(left,.045+j*.168,z-.024,behind,.153,.024,stone[(i+j+1)%stone.length]);
      }
      for(let i=0;i<Math.ceil(d/.37);i++){
        const near=z+i*.37+((j+1)%2)*.13, size=Math.min(z+d-near,.357);
        if(size>.03)for(const side of [-1,1]){
          m.box(side<0?x-.023:x+w-.002,.049+j*.168,near,.025,.151,size,stone[(i+j+(side>0?2:0))%stone.length]);
        }
      }
    }
    m.box(x-.025,.515,z-.026,w+.051,.065,d+.053,"#9e9d89");
  }
  function roof(m,x,z,w,d,y,rise,side){
    const eave=.20, along=w+eave*2;
    const cross=d*.5+.25, ridge=z+d*.5;
    const tile=(a,u,lift=0)=>[x-eave+a,y+rise*(1-u)+.20*Math.sin(Math.PI*u)+.12*u**9+lift,
      ridge+side*u*cross];
    const under=Array.from({length:13},(_,i)=>i/12);
    for(let i=0;i<12;i++){
      const u=under[i],v=under[i+1];
      m.face([tile(0,u,-.038),tile(along,u,-.038),tile(along,v,-.068),tile(0,v,-.068)],"#974b3a",true);
    }
    const rows=Math.ceil(cross/.152),cols=Math.ceil(along/.207);
    for(let j=0;j<rows;j++)for(let i=-1;i<cols;i++){
      const uneven=(random(i*13+j*61)-.5)*.016;
      const left=Math.max(0,(i+(j%2)*.48)*along/cols+.007+uneven);
      const right=Math.min(along,(i+1+(j%2)*.48)*along/cols-.004+uneven);
      if(right-left<.038)continue;
      const u=j/rows,v=Math.min(1.009,(j+1.12)/rows),span=right-left;
      const c=red[(i*3+j*7+23+Math.floor(random(i*37+j*93)*5))%red.length];
      const segments=[0,.19,.39,.61,.81,1];
      function shingle(t,s){
        const arch=Math.sin(Math.PI*s);
        const run=u+(v-u)*t;
        return tile(left+span*s,run-(.014+.003*uneven)*(1-arch)*t**4,.010+arch*.024+.029*t*t);
      }
      for(let k=0;k<5;k++){
        const a=segments[k],b=segments[k+1];
        const tinting=[.16,.055,0,.075,.19][k];
        const color=tint(c,k<2?"#e9a279":"#80443a",tinting);
        m.face([shingle(.0,a),shingle(.0,b),shingle(.66,b),shingle(.66,a)],color,true);
        const aLip=shingle(1,a),bLip=shingle(1,b);
        m.face([shingle(.66,a),shingle(.66,b),bLip,aLip],tint(color,"#e69c73",.065),true);
        m.face([aLip,bLip,[bLip[0],bLip[1]-.022,bLip[2]],[aLip[0],aLip[1]-.022,aLip[2]]],tint(c,"#6d3830",.32));
      }
      if((i+j*3)%5===0&&span>.115){
        const a=shingle(.53,.23),b=shingle(.59,.43),d=shingle(.68,.34);
        m.face([a,b,d].map(([x,y,z])=>[x,y+.003,z]),tint(c,"#efab74",.28),true);
      }
    }
    for(const a of [0,along])for(let i=0;i<9;i++){
      m.beam(tile(a,i/9,-.047),tile(a,(i+1)/9,-.047),.089,.061,wood);
    }
    m.beam(tile(0,1,-.074),tile(along,1,-.074),.075,.053,darkWood);
    for(let i=0;i<Math.ceil(along/.178);i++){
      const a=tile(i*.178,1,-.058);
      const b=tile(i*.178,.963,-.083);
      m.beam(a,b,.055,.086,"#784f37");
    }
  }

  function dormer(m,x,ridge,y){
    const left=x+.54,width=.88,near=ridge+1.13,back=near-.73;
    const bottom=y+.405,sill=y+.835,peak=y+1.244;
    const at=(u,h,b=0)=>[left+u,h,near+b];
    m.face([at(0,bottom),at(width,bottom),at(width,sill),at(width/2,peak),at(0,sill)],"#dbc49b");
    for(const [dx,sign] of [[0,-1],[width,1]]){
      const wall=left+dx;
      m.face([[wall,bottom,near],[wall,sill,near],[wall,sill+.046,back],[wall,bottom,back]],sign<0?"#b19774":"#dbbf92");
      m.beam([wall,sill,near],[wall,sill+.046,back],.085,.074,"#8f613e");
      m.beam(at(dx,bottom,.015),at(dx,sill,.015),.076,.073,darkWood);
      m.beam(at(dx,sill,.019),at(width/2,peak,.019),.067,.058,wood);
    }
    m.beam(at(-.024,sill,.02),at(width+.024,sill,.02),.067,.051,wood);
    aperture(m,at,.189,bottom+.063,.51,.35);
    const run=(side,t,s,extra=0)=>[left+width*.5+side*(width*.5+.136)*s,peak-(peak-sill)*s+.063*Math.sin(Math.PI*s)+extra,
      back-.079+t*(near-back+.236)];
    for(const side of [-1,1]){
      m.face([run(side,0,0,-.045),run(side,1,0,-.045),run(side,1,1,-.048),run(side,0,1,-.048)],"#984e3d",true);
      for(let j=0;j<6;j++)for(let k=0;k<7;k++){
        const s=j/6,t=Math.min(1.01,(j+1.08)/6),a=(k+.033)/7,b=(k+.974)/7,middle=(a+b)/2;
        const c=red[(k*2+j*3+(side>0?2:1))%red.length];
        m.face([run(side,a,s,.014),run(side,b,s,.016),run(side,b,t-.026,.021),run(side,middle,t,.039),run(side,a,t-.024,.021)],c,true);
        m.face([run(side,a,t-.024,.021),run(side,middle,t,.039),run(side,b,t-.026,.021),run(side,b,t-.031,.005),run(side,a,t-.031,.005)],tint(c,ink,.22));
      }
      m.beam(run(side,1,0,-.045),run(side,1,1,-.048),.081,.071,"#734a32");
    }
    m.beam(run(1,-.024,0,.037),run(1,1.034,0,.037),.096,.088,wood);
  }

  function building(g,x,z,w,d,h,rise,isMain){
    const delays=isMain?[107,155,164,206,218,241]:[186,213,225,261,271,288], ridge=z+d*.5;
    const footing=g([x+w/2,.02,z+d/2],delays[0],18,2);
    foundation(footing,x,z,w,d);
    const front=g([x+w/2,.54,z+d],delays[1],24,1,Math.PI).after(.91,footing);
    const back=g([x+w/2,.54,z],delays[2],23,1).after(1.14,footing);
    const sideL=g([x,.54,ridge],delays[1]+5,25,1,Math.PI/2).after(1.10,footing);
    const sideR=g([x+w,.54,ridge],delays[2]+5,23,1,-Math.PI/2).after(1.30,footing);
    // Face coordinates increase from the viewer's left when viewed from outside.
    const near=facade(front,true,(s,y,b)=>[x+s,y,z+d+b],w,.54,h,0);
    const far=facade(back,false,(s,y,b)=>[x+w-s,y,z-b],w,.54,h,2);
    const left=facade(sideL,false,(s,y,b)=>[x-b,y,z+s],d,.54,h,1);
    const right=facade(sideR,false,(s,y,b)=>[x+w+b,y,z+d-s],d,.54,h,1);
    const upper=h-.84;
    aperture(front,near,.29,upper,.61,.57,false,true);
    if(isMain){
      aperture(front,near,w-.97,upper,.62,.55,false,true);
      aperture(front,near,w*.46,.23,.60,1.14,true);
      aperture(front,near,.34,.78,.50,.48);
      aperture(front,near,w-.79,.82,.48,.47);
    }else{
      aperture(front,near,w-.71,.75,.48,.50);
    }
    aperture(back,far,w*.49-.30,upper,.63,.58);
    aperture(sideL,left,d*.37,.84,.54,.56,false,true);
    aperture(sideR,right,d*.42,1.06,.56,.63);
    for(const [m,at] of [[sideL,left],[sideR,right]]){
      for(let i=0;i<12;i++){
        const step=d/12,a=i*step,b=(i+1)*step;
        const tip=s=>h+rise*(1-Math.abs(s/d-.5)*2);
        m.face([at(a,h,0),at(b,h,0),at(b,tip(b),0),at(a,tip(a),0)],i%3?"#a0764e":"#916340");
        m.beam(at(a,h,.009),at(a,tip(a),.009),.019,.013,"#865b3b");
      }
      for(const [a,b] of [[0,d*.5],[d,d*.5]])m.beam(at(a,h,.018),at(b,h+rise,.018),.112,.084,darkWood);
    }
    const loft=g([x+w/2,h-.25,ridge],delays[3]-9,13,2).after(.90,front,back,sideL,sideR);
    loft.box(x+.062,h-.28,z+.061,w-.124,.075,d-.122,"#a78c68");
    for(let i=0;i<Math.floor(w/.25);i++){
      loft.box(x+.08+i*.25,h-.205,z+.074,.222,.013,d-.148,i%3?"#c2a580":"#b69a76");
    }
    // Both slopes share the ridge. Wait for the gable to carry it before unfolding.
    const cap=g([x+w*.5,h+rise,ridge],delays[3]-5,14,2).after(.88,sideL,sideR,front,back);
    cap.beam([x-.29,h+rise+.067,ridge],[x+w+.29,h+rise+.067,ridge],.145,.132,darkWood);
    cap.beam([x-.30,h+rise+.144,ridge-.016],[x+w+.30,h+rise+.144,ridge-.016],.061,.068,"#ac7b4c");
    const r0=g([x+w*.50,h+rise,ridge],delays[3],26,1,0).after(.93,sideL,sideR).after(.62,cap);
    const r1=g([x+w*.50,h+rise,ridge],delays[4],25,1,Math.PI).after(.20,r0).after(.62,cap);
    roof(r0,x,z,w,d,h,rise,1);
    roof(r1,x,z,w,d,h,rise,-1);
    if(isMain)dormer(r0,x,ridge,h);
    if(isMain){
      const cx=x+.56, cz=ridge-.48, cy=h+rise-.66;
      const chimney=g([cx,cy,cz],delays[5],18,2).after(.88,r1);
      chimney.box(cx,cy,cz,.38,1.01,.38,"#899183");
      for(let i=0;i<7;i++){
        const y=cy+.02+i*.142;
        chimney.box(cx-.012,y,cz-.015,.405,.131,.409,stone[i%stone.length]);
        chimney.box(cx+.162+(i%2)*.05,y+.011,cz+.392,.012,.113,.007,"#7a8073");
      }
      chimney.box(cx-.052,cy+1.013,cz-.052,.488,.103,.485,"#abb1a2");
      chimney.box(cx+.062,cy+1.116,cz+.066,.258,.009,.244,"#625e50");
      const mouth=[cx+.19,cy+1.124,cz+.19];
      const smoke=g(mouth,delays[5]+11,15,8).after(.99,chimney);
      for(let j=0;j<25;j++){
        const p=(k,side)=>{
          const u=k/25;
          const width=.035*Math.sin(Math.PI*(.055+.944*u))**.8;
          return [mouth[0]+side*width,mouth[1]+u*1.02,mouth[2]+side*width*.28];
        };
        smoke.face([p(j,-1),p(j,1),p(j+1,1),p(j+1,-1)],j<8?"#c1bbab":"#d6cbb6");
      }
    }
  }

  function foliage(m,x,y,z,size,seed){
    const foot=[x,y,z];
    for(let i=0;i<7;i++){
      const a=tau*(i/7+.05*random(seed+i*95));
      const reach=size*(.52+.55*random(seed+i*29)),height=size*(.60+.26*random(seed+i+913));
      const dx=Math.cos(a),dz=Math.sin(a),w=reach*(.31+.16*random(seed+i));
      const root=[x+dx*.053*size,y+.09*size,z+dz*.053*size];
      const tip=[x+reach*dx,y+height*.67,z+reach*dz];
      const mid=[x+.57*reach*dx,y+height,z+.57*reach*dz];
      const a0=[mid[0]-dz*w,mid[1]-.085*size,mid[2]+dx*w],b0=[mid[0]+dz*w,mid[1]-.10*size,mid[2]-dx*w];
      m.beam(foot,mid,.016*size+.008,.017*size+.008,"#697946");
      m.face([root,a0,tip,mid],leaf[(i+seed)%leaf.length],true);
      m.face([root,mid,tip,b0],leaf[(i+seed+2)%leaf.length],true);
    }
  }
  function pot(m,x,y,z,s,c){
    const mouth=m.lathe(x,y,z,[[0,.15*s],[.043*s,.156*s],[.31*s,.222*s],[.34*s,.235*s],[.39*s,.226*s]],c);
    m.face(mouth,"#665042",true);
  }
  function round(m,x,y,z,r,c){
    const rows=[[0,.53*r],[.20*r,.84*r],[.60*r,r],[1.11*r,.85*r],[1.34*r,.48*r]];
    const cap=m.lathe(x,y,z,rows,c,9);
    m.face(cap,Array.isArray(c)?c[0]:c,true);
  }
  function raisedBed(g,x,z,w,d,seed){
    const timing=angle(x+w/2,z+d/2);
    const bed=g([x+w*.5,.012,z+d*.5],timing-7,22,2);
    bed.box(x,.028,z,w,.13,d,"#8f6445");
    bed.box(x+.081,.154,z+.081,w-.16,.013,d-.16,"#765944");
    for(const [a,b,f,h] of [[x,z,w,.077],[x,z+d-.077,w,.077],[x,z,.076,d],[x+w-.076,z,.076,d]]){
      bed.box(a,.095,b,f,.094,h,"#b48051");bed.box(a,.184,b,f,.020,h,"#c39663");
    }
    for(let r=0;r<3;r++)for(let c=0;c<4;c++){
      const px=x+.27+(w-.52)*c/3,pz=z+.23+(d-.44)*r/2;
      const delay=timing+4+r*3+c*1.6;
      const crop=g([px,.164,pz],delay,16,2,0,.13+random(r*17+c)*.67).after(.86+r*.07+c*.055,bed);
      if((r+c+seed)%5===0){
        round(crop,px,.159,pz,.131,["#e2a452","#c98339","#ecb352"]);
        crop.beam([px,.308,pz],[px+.024,.365,pz-.031],.035,.032,"#758151");
      }else{
        foliage(crop,px,.166,pz,.17+random(r*391+c*123)*.130,r*19+c*11+seed);
        if((c+r+seed)%3===0)round(crop,px+.074,.169,pz+.051,.084,["#bd623e","#cc7951","#d88658"]);
      }
    }
  }

  function market(g){
    const x0=.73,x1=2.98,z0=1.03,z1=2.42, top=1.77,high=2.53;
    const counter=g([1.89,.01,1.89],264,19,2);
    for(let i=0;i<4;i++){
      counter.box(1.55,.09+i*.13,1.50,1.12,.11,.54,stone[(i+2)%5]);
      counter.box(2.67,.09+i*.13,1.50,.26,.11,.56,stone[i%5]);
    }
    counter.box(1.44,.622,1.44,1.56,.096,.67,"#b6ae91");
    const posts=[];
    for(const [x,z,y] of [[x0,z1,top],[x1,z1,top],[x0,z0,high],[x1,z0,high]]){
      const post=g([x,.015,z],267+posts.length*1.3,22,1,Math.PI/2);
      posts.push(post);
      post.beam([x,.025,z],[x,y+.08,z],.087,.089,wood);
      post.beam([x,.025,z],[x,y+.08,z],.035,.042,"#a77549");
      post.beam([x,y-.35,z],[x+(x===x0?.29:-.29),y-.074,z],.043,.053,wood);
    }
    const frame=g([1.8,top,z1],284,14,2).after(.91,...posts);
    frame.beam([x0-.084,top,z1],[x1+.078,top,z1],.106,.094,wood);
    frame.beam([x0-.084,high,z0],[x1+.078,high,z0],.075,.081,wood);
    for(const x of [x0,x1])frame.beam([x,top,z1],[x,high,z0],.080,.068,wood);
    const fabric=g([1.83,top,z1],306,27,1,0,2.0).after(.89,frame);
    const cover=(u,v,bias=0)=>[x0-.104+(x1-x0+.20)*u,high+(top-high)*v-.208*Math.sin(Math.PI*v)+.038*Math.cos(u*7*Math.PI)*(.40+.60*v)+bias,z0+(z1-z0+.08)*v];
    for(let i=0;i<30;i++)for(let j=0;j<11;j++){
      const a=i/30,b=(i+1)/30,u=j/11,v=(j+1)/11,c=(i%4===0?0:Math.floor((1+Math.cos(i*.53+j*.18))*1.35)+1);
      fabric.face([cover(a,u),cover(b,u),cover(b,v),cover(a,v)],blues[c],true);
    }
    for(const u of [.033,.078,.92,.967])for(let j=0;j<14;j++){
      fabric.beam(cover(u,j/14,.008),cover(u,(j+1)/14,.008),.018,.012,"#77b2b8");
    }
    for(let i=0;i<7;i++)for(let j=0;j<3;j++){
      const x=.156+i*.114,z=.19+j*.255,w=.041,h=.092;
      const corners=[cover(x-w,z,.030),cover(x,z-h,.030),cover(x+w,z,.030),cover(x,z+h,.030)];
      for(let k=0;k<4;k++)fabric.beam(corners[k],corners[(k+1)%4],.014,.010,"#82b0b8");
    }
    for(let i=0;i<24;i++){
      const p=cover(i/24,1),q=cover((i+1)/24,1);
      fabric.face([p,q,[q[0],q[1]-.112,q[2]+.026],[p[0],p[1]-.152,p[2]+.024]],blues[i%4]);
    }
    for(const [x,z,s] of [[1.60,1.63,.55],[2.66,1.76,.73],[2.42,1.74,.51]]){
      const jar=g([x,.717,z],270+(x-1)*6,16,2).after(.88,counter);
      pot(jar,x,.720,z,s,["#b0633f","#c48349","#aa5739","#d49051"]);
    }
  }

  function surroundings(g){
    gardens.forEach(([x,z,w,d],i)=>raisedBed(g,x,z,w,d,1+i));
    for(const [x,z,s,seed] of [[3.22,2.40,.65,19],[3.14,-2.09,.72,12],[-1.21,-2.91,.76,2],[.84,-3.37,.64,12],[2.10,3.79,.48,13],[-2.1,3.75,.42,5]]){
      const delay=angle(x,z);
      const vessel=g([x,0,z],delay,20,2);
      pot(vessel,x,.01,z,s,["#bc704a","#ca8250","#aa613f"]);
      const plant=g([x,.372*s,z],delay+8,21,2,0,.72).after(.91,vessel);
      foliage(plant,x,.375*s,z,s,seed);
    }
    for(const [a,b] of [[[-3.15,-3.22],[-4.32,-1.66]],[[-4.32,-1.66],[-4.65,-.29]],[[3.51,-2.90],[4.31,-1.66]],[[4.31,-1.66],[4.72,-.29]]]){
      const z=(a[1]+b[1])/2,x=(a[0]+b[0])/2, t=angle(x,z);
      const fence=g([x,.024,z],Math.max(5,t-10),25,1,Math.atan2(b[1]-a[1],b[0]-a[0]));
      for(const [x,z] of [a,b])fence.box(x-.043,0,z-.043,.086,.69,.087,"#a36d4b");
      for(const y of [.22,.49])fence.beam([a[0],y,a[1]],[b[0],y+.032,b[1]],.058,.047,"#ad7954");
    }
    const crate=g([-2.46,.01,3.02],angle(-2.46,3.02),21,1,Math.PI/2);
    crate.box(-2.73,.046,2.75,.56,.233,.51,"#8b5f43");
    crate.box(-2.74,.023,2.746,.59,.069,.54,"#b18757");
    crate.box(-2.73,.254,2.75,.60,.069,.54,"#ba8d60");
    for(let i=0;i<8;i++)round(crate,-2.67+i%4*.133,.285+random(i+45)*.051,2.82+Math.floor(i/4)*.24,.087,["#cf883f","#e5a24e","#bd783c"]);
    const steps=g([-1.04,.016,3.19],157,20,2);
    for(let i=0;i<3;i++)steps.box(-1.30,0,3.01+.14*i,.67,.22-.065*i,.241,stone[(i+2)%5]);
    for(let i=0;i<7;i++){
      const x=-.97+.13*Math.sin(i*.49), z=3.45+i*.235;
      const path=g([x,0,z],angle(x,z)-3,15,2);
      path.box(x-.166,.008,z-.112,.33+.032*random(i*3),.032,.226,stone[i%5]);
    }
    for(let row=0;row<5;row++)for(let column=0;column<12;column++){
      const x=-2.47+.267*column+(row%2)*.107, z=2.88+.136*row;
      if((x<-.99&&z>3.32)||(row>3&&x>.03))continue;
      const r=.111+random(column+row*23)*.018,d=.053+random(row+column*11)*.011;
      const slab=g([x,.002,z],angle(x,z)+2,11,2);
      const y=.024+random(row*32+column*4)*.014, c=stone[(row*2+column*3)%5];
      const pts=[[-r+.023,-d],[r-.022,-d],[r,-d+.018],[r,d-.018],[r-.024,d],[-r+.020,d],[-r,d-.018],[-r,-d+.017]];
      const face=pts.map(([a,b])=>[x+a,y,z+b]);
      slab.face(face,tint(c,"#d2bd99",.37),true);
      for(let i=0;i<face.length;i++){
        const a=face[i],b=face[(i+1)%face.length];
        slab.face([a,b,[b[0],.001,b[2]],[a[0],.001,a[2]]],tint(c,"#726b55",.27));
      }
    }
    const wagon=g([1.05,.026,4.08],angle(1.05,4.08)+9,24,1,Math.PI*.18);
    const cart=(x,y,z)=>[1.05+x*.953-z*.303,y,4.08+x*.303+z*.953];
    for(let j=0;j<5;j++){
      wagon.beam(cart(-.33+j*.14,.36,-.50),cart(-.33+j*.14,.36,.33),.132,.046,"#ad7950");
    }
    for(const x of [-.34,.35]){
      for(let row=0;row<2;row++)wagon.beam(cart(x,.393+row*.122,-.49),cart(x,.417+row*.122,.36),.095,.089,row?"#aa754a":"#956744");
      wagon.beam(cart(x,.39,-.27),cart(x*.73,.29,.90),.050,.038,"#8c5a37");
      const axle=cart(x*1.12,.277,-.04);
      for(let j=0;j<12;j++){
        const point=a=>cart(x*1.12,.277+.220*Math.sin(a),-.04+.220*Math.cos(a));
        const a=point(tau*j/12),b=point(tau*(j+1)/12);
        wagon.beam(a,b,.061,.056,"#704f39");
        if(j%2===0)wagon.beam(axle,a,.032,.035,"#b48251");
      }
    }
    for(const [x,z,s] of [[-.13,-.22,.53],[.17,-.17,.45],[.04,.03,.62]]){
      const fruit=cart(x,.391,z);
      round(wagon,...fruit,s*.24,["#d7994c","#ca7d41","#e1a355"]);
    }
    for(let i=0;i<58;i++){
      const a=tau*random(79+i*51),r=3.88+random(163+i*62)*1.03;
      const x=r*Math.sin(a),z=r*Math.cos(a),s=.056+.066*random(719+i);
      const nearSpine=Math.min(angle(x,z),360-angle(x,z))<6;
      if((x> -1.4&&x<2.0&&z>2.6)||nearSpine)continue;
      const grass=g([x,.012,z],angle(x,z),18,2,0,random(i*7));
      foliage(grass,x,.014,z,s,12+i);
      if(i%5===0){
        const y=.094;
        round(grass,x+.02,y,z,.031,["#dec77c","#ede199"]);
        grass.beam([x,.025,z],[x+.018,y,z],.011,.010,"#789050");
      }
    }
  }
  function orchard(g){
    const x=3.13,z=.36,root=[x,.012,z],trunk=g(root,233,26,1,Math.PI*.20,-1);
    const twigs=[
      [[x,.015,z],[x-.15,1.02,z-.14],.18],
      [[x-.15,.93,z-.11],[x+.11,1.57,z+.08],.12],
      [[x-.12,1.15,z-.13],[x-.67,1.61,z+.21],.086],
      [[x+.022,1.33,z+.04],[x+.52,1.68,z-.30],.092],
      [[x-.12,1.13,z-.09],[x-.22,1.52,z-.48],.074],
      [[x-.12,.89,z-.13],[x+.05,1.30,z+.22],.10],
      [[x+.05,1.30,z+.22],[x+.31,1.72,z+.35],.071],
      [[x+.05,1.30,z+.22],[x-.19,1.68,z+.32],.053]
    ];
    for(const [a,b,w] of twigs){
      trunk.beam(a,b,w,w,"#987253");
      trunk.beam([a[0]+w*.23,a[1],a[2]+w*.30],[b[0]+w*.23,b[1],b[2]+w*.30],w*.25,w*.33,"#b38967");
    }
    const green=[["#71896a","#91a279","#a7b681"],["#738e71","#8caa84","#acbb8c"],["#819775","#9fae7c","#b4bc8c"]];
    const clusters=[[-.60,1.46,.18,.44],[.60,1.60,-.24,.40],[-.29,1.57,-.49,.38],[-.08,1.85,-.08,.52],
      [.25,1.63,.21,.43],[.44,1.87,.20,.27],[-.51,1.89,.09,.28],[-.13,1.63,.35,.42]];
    clusters.forEach(([a,h,b,r],i)=>{
      const canopy=g([x+a,h-.08,z+b],251+i*2.4,20,2,0,-1.5).after(.96,trunk);
      const rings=[[0,.35],[.22,.83],[.62,1],[1.05,.81],[1.29,.36]].map(([up,span],row)=>
        Array.from({length:11},(_,k)=>{
          const phi=tau*(k+.22*(row%2))/11+i*.7;
          const reach=r*span*(.88+.22*random(i*71+k*13+row));
          return [x+a+reach*Math.cos(phi),h-.10+r*(up+.10*random(i*97+row*11+k)),z+b+reach*Math.sin(phi)];
        }));
      for(let row=0;row<4;row++)for(let j=0;j<11;j++){
        const k=(j+1)%11,c=tint(green[i%3][row<=1?0:row===2?1:2],"#a5b483",random(i*31+j)*.27);
        canopy.face([rings[row][j],rings[row+1][j],rings[row+1][k]],c,true);
        canopy.face([rings[row][j],rings[row+1][k],rings[row][k]],tint(c,"#899774",.14),true);
      }
      canopy.face(rings[4],green[i%3][2],true);
      for(let j=0;j<9;j++){
        const q=j*tau/5+i*1.85, d=r*(.64+.17*random(i*11+j));
        const px=x+a+d*Math.cos(q),pz=z+b+d*Math.sin(q);
        const y=h+r*.49+.022*random(i*8+j), tint=["#d89d83","#e8bf9d","#e7c6a3","#d6ad94"];
        if((i+j)%3){
          const v=.038+.018*random(i*12+j*9);
          for(let k=0;k<4;k++){
            const dir=q+k*Math.PI/2,dx=v*Math.cos(dir),dz=v*Math.sin(dir);
            canopy.face([[px,y,pz],[px+dx-dz*.46,y+.019,pz+dz+dx*.46],
              [px+1.23*dx,y+.035,pz+1.23*dz],[px+dx+dz*.46,y+.021,pz+dz-dx*.46]],tint[k],true);
          }
        }
      }
    });
    const bench=g([3.40,.01,1.48],252,21,1,0);
    for(const x of [3.02,3.65])bench.box(x,.015,1.30,.083,.32,.090,"#746049");
    for(const z of [1.24,1.38,1.52])bench.box(2.97,.29,z,.85,.056,.122,"#b99162");
    for(const [x,z,r] of [[2.46,-.01,.19],[3.87,.90,.20],[3.39,-.41,.15],[2.69,.53,.21]]){
      const sprouts=g([x,.01,z],angle(x,z)+3,18,2,0,.6);
      foliage(sprouts,x,.011,z,r,Math.round(z*13+29));
    }
    GardenLife.petals(g,trunk);
  }

  function build(){
    const groups=[];
    const records=new WeakMap();
    const factory=map=>(pivot,at,duration,mode,hinge,flutter)=>{
      const data=[], raw=mesh(data,map(pivot),at,duration,mode,hinge,flutter);
      const group={data,at,duration,mode,dependencies:[]};
      const brush=map===estate?meshMapper(raw,map):raw;
      brush.after=(moment,...supports)=>{
        for(const support of supports)group.dependencies.push([records.get(support),moment]);
        return brush;
      };
      records.set(brush,group);groups.push(group);
      return brush;
    };
    function meshMapper(m,point){
      const size=estateScale;
      return {
        face(coords,...args){m.face(coords.map(point),...args);},
        box(x,y,z,w,h,d,c){m.box(...point([x,y,z]),w*size,h*size,d*size,c);},
        beam(a,b,w,d,c){m.beam(point(a),point(b),w*size,d*size,c);},
        lathe(x,y,z,rings,c,segments){
          return m.lathe(...point([x,y,z]),rings.map(([h,r])=>[h*size,r*size]),c,segments)
            .map(([x,y,z])=>[(x-estateOrigin[0])/size,y/size,(z-estateOrigin[1])/size]);
        }
      };
    }
    const buildingGroup=factory(estate),gardenGroup=factory(p=>p);
    building(buildingGroup,-1.95,-1.82,2.91,3.04,2.62,1.26,true);
    building(buildingGroup,.96,-1.74,1.81,2.69,2.13,.94,false);
    market(buildingGroup);
    surroundings(gardenGroup);
    orchard(gardenGroup);
    GardenLife.windmill(gardenGroup);
    GardenLife.garland(gardenGroup);
    GardenLife.borders(gardenGroup,angle);
    GardenLife.swallow(gardenGroup);
    GardenLamps.build(gardenGroup);
    GardenCat.build(gardenGroup);
    for(const [x,z,delay,c] of [[-3.20,1.74,103,"#e0aa60"],[2.82,2.68,246,"#de9676"]]){
      const wing=gardenGroup([x,.42,z],delay,18,3,0,.66);
      wing.beam([x,.42,z-.05],[x,.43,z+.07],.023,.021,"#705139");
      for(const k of [-1,1]){
        wing.face([[x,.43,z+.04],[x+k*.14,.48,z+.12],[x+k*.12,.47,z-.006],[x,.43,z-.018]],c,true);
        wing.face([[x,.43,z-.018],[x+k*.084,.47,z-.055],[x+k*.031,.45,z-.094],[x,.42,z-.059]],"#c77950",true);
      }
    }
    let length=0;
    for(const g of groups)length+=g.data.length;
    const vertices=new Float32Array(length);
    const lampTimings=[];
    for(const group of groups){
      const {data,at,duration,dependencies}=group;
      let edge=0;
      for(let i=0;i<data.length;i+=17)edge=Math.max(edge,angle(data[i],data[i+2]));
      const needed=Math.max(at,edge+12,...dependencies.map(([parent,stage])=>parent.timing+stage*parent.span));
      const timing=group.mode===7?-2:group.mode===9?at:Math.min(needed,351);
      const span=Math.min(duration,359.8-timing);
      group.timing=timing;group.span=span;
      if(group.mode===10){
        const index=GardenLamps.lamps.findIndex(p=>Math.abs(p[0]-data[9])<.01);
        lampTimings[index]={at:timing,span};
      }
      for(let i=0;i<data.length;i+=17){
        data[i+13]=timing;
        data[i+14]=span;
      }
    }
    // Completed scenery stays in a single draw call. Unexposed geometry never
    // enters the vertex shader or the shadow pass.
    let offset=0;
    const batches=[];
    for(const group of groups.sort((a,b)=>a.timing-b.timing)){
      vertices.set(group.data,offset);offset+=group.data.length;
      batches.push({at:group.timing,end:offset/17});
    }
    return {vertices,batches,lampTimings};
  }

  function groundArt(plan){
    const c=document.createElement("canvas");c.width=c.height=2048;
    const p=c.getContext("2d");p.translate(1024,1024);p.scale(1024/radius,1024/radius);
    p.fillStyle=plan?"#ede0c1":"#a5aa7b";
    p.fillRect(-radius,-radius,2*radius,2*radius);
    if(!plan){
      for(const [x,z,r,color] of [[-2.2,2.4,3.3,"#aeaa82"],[2.1,-2.3,3.2,"#8c9e74"],[2.9,2.6,2.8,"#b6b184"],[-3,-2.6,3.0,"#8c9f75"]]){
        const fade=p.createRadialGradient(x,z,0,x,z,r);fade.addColorStop(0,color);fade.addColorStop(1,color+"00");
        p.fillStyle=fade;p.fillRect(x-r,z-r,r*2,r*2);
      }
      // Soft flower-bed washes and small ink strokes tie the cut paper plants
      // into the lawn, following the radial grain of the circular stock.
      for(let i=0;i<64;i++){
        const a=tau*random(i*97+15),r=2.65+2.24*random(i*23+4);
        const x=r*Math.sin(a),z=r*Math.cos(a);
        const w=.27+.72*random(i*71),h=.16+.24*random(i*41+21);
        p.save();p.translate(x,z);p.rotate(-a+.52);p.scale(w,h);
        const wash=p.createRadialGradient(0,0,0,0,0,1);
        wash.addColorStop(0,i%3?"#657d5945":"#d1bc8b82");wash.addColorStop(1,"#b7ba8c00");
        p.fillStyle=wash;p.fillRect(-1,-1,2,2);p.restore();
        for(let j=0;j<14;j++){
          const dx=x+(random(i*11+j*89)-.5)*w*1.4,dz=z+(random(j*17+i*31)-.5)*h*1.9;
          const s=.02+.07*random(i*109+j);
          p.strokeStyle=j%4?"#566e4b4a":"#e0d3a4a8";p.lineWidth=.008;
          p.beginPath();p.moveTo(dx-s*.15,dz-s*.70);p.lineTo(dx,dz);p.lineTo(dx+s*.76,dz-s*.48);p.stroke();
        }
      }
    }
    for(let i=0;i<16800;i++){
      const x=(2*random(i*17)-1)*radius,z=(2*random(i*23)-1)*radius;
      p.fillStyle=plan?(i%3?"#f9efd533":"#82745219"):(i%3?"#e0ce9c47":"#5b73453d");
      p.fillRect(x,z,.005+.025*random(i),.006+.015*random(i+31));
    }
    const tiles=["#c3b99a","#b9b499","#cbc09f","#b6b499","#aeb099"];
    if(!plan){
      p.strokeStyle="#b4a379";p.lineWidth=1.06;p.lineCap="round";
      p.beginPath();p.moveTo(-1.02,2.93);p.bezierCurveTo(-.93,3.55,-1.04,4.92,-.84,5.29);p.stroke();
      p.lineWidth=.62;p.strokeStyle="#c3b28b";p.beginPath();p.moveTo(.17,3.58);p.quadraticCurveTo(2.76,3.17,4.63,2.35);p.stroke();
      for(let r=0;r<9;r++)for(let j=0;j<14;j++){
        const x=-2.18+j*.37+(r%2)*.14,z=1.22+.16*r;
        if(x<-1.1&&z>1.72)continue;
        const [xx,_,zz]=estate([x,0,z]);
        p.fillStyle=tiles[Math.floor(random(j+r*14)*tiles.length)];p.fillRect(xx,zz,.348*estateScale,.145*estateScale);
      }
      for(const [x,z,w,h] of [[-1.01,1.47,1.57,1.28],[.73,1.51,1.43,1.52],[-3.04,-1.65,.8,.76],[-3.46,2,.90,.63],[.78,3.33,1.18,.61],[3.12,.45,1.04,.91]]){
        const shadow=p.createRadialGradient(0,0,.20,0,0,1);
        shadow.addColorStop(0,"#49573c62");shadow.addColorStop(.63,"#55583d36");shadow.addColorStop(1,"#55583d00");
        p.save();p.translate(x,z);p.scale(w,h);p.fillStyle=shadow;p.fillRect(-1,-1,2,2);p.restore();
      }
    }else{
      p.strokeStyle="#907a57";p.lineWidth=.032;
      const layouts=[[-1.95,-1.82,2.91,3.04],[.96,-1.74,1.81,2.69],[.71,.98,2.3,1.52]].map(([x,z,w,d])=>{
        const [a, , b]=estate([x,0,z]);return [a,b,w*estateScale,d*estateScale];
      });
      for(const [x,z,w,d] of [...layouts,...gardens]){
        p.strokeRect(x,z,w,d);p.lineWidth=.012;p.strokeRect(x+.085,z+.085,w-.17,d-.17);
        for(let s=.17;s<w-.07;s+=.25){
          p.globalAlpha=.44;p.beginPath();p.moveTo(x+s,z+.088);p.lineTo(x+s,z+d-.082);p.stroke();p.globalAlpha=1;
        }
        p.lineWidth=.032;
      }
      p.setLineDash([.055,.098]);p.lineWidth=.021;
      p.beginPath();p.moveTo(-1.05,2.89);p.quadraticCurveTo(-.90,3.55,-.81,5.11);p.moveTo(.03,3.56);p.quadraticCurveTo(2.66,3.12,4.54,2.32);p.stroke();
      p.setLineDash([]);
      for(const [x,z,r] of [[3.22,2.4,.39],[3.14,-2.09,.44],[-1.21,-2.91,.39],[.84,-3.37,.38],[-2.10,3.75,.31],[-2.46,3.02,.25],[2.1,3.79,.27],[3.13,.36,.81]]){
        p.beginPath();p.arc(x,z,r,0,tau);p.stroke();
        p.beginPath();p.arc(x,z,r*.74,.45,5.9);p.stroke();
      }
    }
    p.strokeStyle=plan?"#a68d65":"#d7d2a4";p.lineWidth=.018;
    for(const r of [5.11,5.24]){
      p.beginPath();p.arc(0,0,r,0,tau);p.stroke();
    }
    for(let i=0;i<36;i++){
      const a=tau*i/36,r=i%3?5.20:5.14;
      p.beginPath();p.moveTo(r*Math.sin(a),r*Math.cos(a));p.lineTo(5.23*Math.sin(a),5.23*Math.cos(a));p.stroke();
    }
    return c;
  }
  return {build,groundArt,radius,start};
})();
