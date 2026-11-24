"use strict";

globalThis.GardenCat=(()=>{
  const tau=Math.PI*2;
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  const mix=(a,b,k)=>a+(b-a)*k;
  const mod=(x,b)=>((x%b)+b)%b;

  // A ground track with an arc-length lookup keeps the footsteps even through
  // bends. The first track stays on the grass outside the raised beds.
  function track(knots,closed){
    const n=knots.length,segments=closed?n:n-1;
    const get=i=>knots[closed?mod(i,n):clamp(i,0,n-1)];
    function curve(q){
      const i=Math.min(Math.floor(q),segments-1),t=q-i;
      const [a,b,c,d]=[i-1,i,i+1,i+2].map(get);
      return b.map((v,k)=>.5*(2*v+(c[k]-a[k])*t+
        (2*a[k]-5*v+4*c[k]-d[k])*t*t+(-a[k]+3*v-3*c[k]+d[k])*t*t*t));
    }
    const samples=segments*32,lengths=[0];
    let previous=curve(0),length=0;
    for(let i=1;i<=samples;i++){
      const p=curve(i/32);
      length+=Math.hypot(p[0]-previous[0],p[1]-previous[1]);
      lengths.push(length);previous=p;
    }
    return {length,point(distance){
      const s=closed?mod(distance,length):clamp(distance,0,length);
      let lo=0,hi=samples;
      while(hi-lo>1){const mid=(lo+hi)>>1;if(lengths[mid]<=s)lo=mid;else hi=mid;}
      return curve((lo+(s-lengths[lo])/(lengths[hi]-lengths[lo]))/32);
    }};
  }
  const approach=track([[-3.76,-3.15],[-4.29,-2.56],[-4.65,-1.86],[-4.88,-.83],[-4.89,.33],
    [-4.68,1.45],[-4.12,2.65],[-3.36,3.63],[-2.46,4.19],[-1.64,4.37]],false);
  const courtyard=track([[-1.64,4.37],[-.87,4.55],[-.03,4.46],[.40,4.06],
    [.16,3.68],[-.54,3.65],[-1.18,3.74],[-1.69,4.0]],true);
  const period=6.65;
  function patrol(time){
    const u=mod(time,period);
    // At the stone path the cat pauses to look over its shoulder.
    if(u>5.62)return courtyard.length;
    const ramp=.48,stop=5.62;
    const d=u<ramp?u*u/(2*ramp):u>stop-ramp?stop-ramp-(stop-u)**2/(2*ramp):u-ramp*.5;
    return courtyard.length*d/(stop-ramp);
  }
  function location(angle,time){
    const a=smooth((angle-54)/123)*approach.length;
    const p=approach.point(a);
    const blend=smooth((angle-174)/40);
    const q=courtyard.point(patrol(time-4.95));
    return [mix(p[0],q[0],blend),mix(p[1],q[1],blend)];
  }
  function jump(age){
    if(age<0||age>1.48)return {lift:0,pitch:0,crouch:0,reach:0};
    const launch=clamp((age-.14)/.66),arc=4*launch*(1-launch);
    const anticipation=Math.sin(Math.PI*clamp(age/.17));
    const landing=Math.sin(Math.PI*clamp((age-.76)/.30));
    const reach=.245*smooth((age-.14)/.62)*(1-smooth((age-.83)/.65));
    return {lift:.34*arc,pitch:.19*arc*(.49-launch)*2,crouch:anticipation*.11+landing*.077,reach};
  }
  function pose(angle,time,callAge=-Infinity,angleRate=35){
    const p=location(angle,time),dt=.014;
    const ahead=location(clamp(angle+angleRate*dt,0,360),time+dt);
    const dv=[ahead[0]-p[0],ahead[1]-p[1]],speed=Math.hypot(...dv)/dt;
    const approachDist=smooth((angle-54)/123)*approach.length;
    const patrolDist=patrol(time-4.95),blend=smooth((angle-174)/40);
    const q0=approach.point(Math.max(0,approachDist-.045)),q1=approach.point(approachDist+.045);
    const c0=courtyard.point(patrolDist-.035),c1=courtyard.point(patrolDist+.035);
    const outerHeading=Math.atan2(q1[0]-q0[0],q1[1]-q0[1]);
    const ringHeading=Math.atan2(c1[0]-c0[0],c1[1]-c0[1]);
    const delta=Math.atan2(Math.sin(ringHeading-outerHeading),Math.cos(ringHeading-outerHeading));
    const heading=outerHeading+delta*blend;
    const run=clamp(speed/1.40);
    // Both ends of the patrol share a footfall phase, including repeated loops.
    const phase=tau*(approachDist*1.58+9*patrolDist/courtyard.length*blend);
    const lookBack=smooth((mod(time-4.95,period)-5.0)/.57)*(1-smooth((mod(time-4.95,period)-6.20)/.45))*blend;
    const auto=mod(time-14.21,9.30);
    const localAge=(angle>=310&&time>=14.21&&auto<1.48)?auto:-Infinity;
    const age=callAge>=0&&callAge<=1.48?callAge:localAge;
    const action=jump(age);
    const headYaw=-.74*lookBack+.155*Math.sin(time*2.42)*(1-run);
    const tilt=.19*lookBack+.25*(action.lift/.34)-.045*Math.sin(phase)*run;
    const root=[p[0]+action.reach*Math.sin(heading),.009+.012*blend,p[1]+action.reach*Math.cos(heading),heading];
    const gait=[phase,run,action.pitch+(run*.067)*Math.sin(phase*2+.5),action.lift];
    const look=[headYaw,tilt,.41*Math.sin(3.8*time)+.19*Math.sin(6.32*time+.9),action.crouch];
    return {root,gait,look,point:[root[0],root[1]+.38+action.lift,root[2]],visible:angle>=55};
  }

  function build(g){
    const release=49,span=14;
    const part=(id,p=[0,0,0])=>g(p,release,span,9,id,0);
    const orange="#c87643",gold="#de9856",ginger="#dfa065",umber="#aa5938";
    const white="#f4e4c5",light="#fff1d7",shadow="#d9c3a2";
    const body=part(0);
    // Longitudinal polygon rings keep the side planes and the white bib visible
    // even at a small projected size.
    function volume(m,slices,paint,n=8){
      const rings=slices.map(([z,y,rx,ry])=>Array.from({length:n},(_,i)=>{
        const a=tau*i/n;return [Math.sin(a)*rx,y+Math.cos(a)*ry,z];
      }));
      for(let j=0;j<rings.length-1;j++)for(let k=0;k<n;k++){
        const i=(k+1)%n;
        m.face([rings[j][k],rings[j+1][k],rings[j+1][i],rings[j][i]],paint(j,k));
      }
      m.face(rings[0],paint(0,1));m.face([...rings[rings.length-1]].reverse(),paint(rings.length-2,1));
      return rings;
    }
    const trunk=volume(body,[[-.29,.31,.068,.073],[-.19,.329,.15,.152],[-.022,.34,.166,.166],
      [.132,.333,.14,.147],[.23,.344,.091,.119]],(j,k)=>{
      if(k===3||k===4)return white;
      if(j===3&&(k===2||k===5))return light;
      return [gold,ginger,orange,shadow,shadow,orange,ginger,gold][k];
    });
    // Two tapered tabby marks follow the facets on each side of the back.
    for(let ring=1;ring<=2;ring++)for(const sign of [-1,1]){
      const selected=sign>0?[0,1,2]:[0,7,6];
      const [top,mid,side]=selected.map(index=>trunk[ring][index]);
      const mark=(p,d)=>[p[0]*1.024,p[1]+.002,p[2]+d];
      body.face([mark(top,-.032),mark(top,.019),mark(mid,.033),mark(mid,-.022)],"#bc693e");
      body.face([mark(mid,-.022),mark(mid,.033),mark(side,.047)],"#b96a43");
    }
    const head=part(1,[0,.40,.155]);
    volume(head,[[.133,.473,.082,.107],[.206,.497,.152,.146],[.285,.488,.150,.139],
      [.354,.472,.097,.104],[.371,.458,.057,.067]],(j,k)=>{
      if(k===3||k===4)return light;
      if(k===2||k===5)return j>=1?white:ginger;
      return j===2&&(k===0||k===7)?gold:ginger;
    });
    for(const s of [-1,1]){
      const earFront=[s*.069,.579,.270],earOuter=[s*.157,.555,.249],earBack=[s*.112,.559,.151],
        tip=[s*.143,.719,.180];
      head.face([earFront,tip,earOuter],orange);head.face([earOuter,tip,earBack],umber);
      head.face([earBack,tip,earFront],gold);
      head.face([[s*.096,.585,.260],[s*.141,.675,.199],[s*.141,.573,.251]],"#ce856d");
      const center=[s*.112,.505,.338],inner=[s*.086,.505,.351],outer=[s*.135,.519,.313];
      head.face([inner,[s*.111,.523,.337],outer,[s*.112,.495,.339]],"#433b37");
      head.face([[center[0],.510,center[2]+.003],[s*.107,.518,.341],[s*.101,.512,.347]],light);
      head.face([[s*.035,.6,.283],[s*.058,.602,.278],[s*.063,.562,.325]],umber);
      head.face([[s*.107,.480,.348],[s*.158,.467,.295],[s*.142,.453,.312]],orange);
      head.face([[0,.448,.386],[s*.061,.455,.374],[s*.088,.434,.352],[s*.028,.423,.376]],light);
    }
    head.face([[-.029,.468,.378],[.029,.468,.378],[0,.445,.393]],"#996e60");
    head.face([[0,.446,.389],[-.012,.433,.381],[.012,.433,.381]],"#77554a");
    for(let i=0;i<4;i++){
      const side=i%2?1:-1,fore=i<2,hip=[side*.092,.290,fore?.148:-.176];
      const leg=part(2+i,hip);
      const knee=[hip[0]+side*.003,.167,hip[2]+(fore?-.026:.091)];
      const ankle=[hip[0],.073,hip[2]+(fore?-.020:-.009)];
      leg.beam(hip,knee,fore?.074:.089,fore?.072:.100,fore?ginger:orange);
      leg.beam(knee,ankle,.058,.057,white);
      const y=.020,x=ankle[0],z=ankle[2];
      const sole=[ [x-.039,y,z-.026],[x+.039,y,z-.026],[x+.047,y,z+.046],
        [x+.031,y,z+.079],[x-.029,y,z+.079],[x-.047,y,z+.045] ];
      const foot=[x,.084,z+.008];
      for(let k=0;k<sole.length;k++)leg.face([sole[k],foot,sole[(k+1)%sole.length]],k%3?white:light);
    }
    const tail=part(6,[0,.324,-.233]);
    const knots=[[0,.324,-.233,.078],[-.015,.354,-.327,.071],[-.045,.415,-.390,.064],[-.068,.501,-.409,.059],
      [-.054,.573,-.421,.051],[-.017,.626,-.423,.046],[.024,.648,-.406,.037],[.052,.641,-.386,.018]];
    const rings=knots.map(([x,y,z,r],j)=>{
      const next=knots[Math.min(j+1,knots.length-1)],prev=knots[Math.max(0,j-1)],dy=next[1]-prev[1],dz=next[2]-prev[2];
      const length=Math.hypot(dy,dz)||1;
      return Array.from({length:6},(_,i)=>{const a=i*tau/6;return [x+r*Math.cos(a),y+r*Math.sin(a)*dz/length,z-r*Math.sin(a)*dy/length];});
    });
    for(let j=0;j<rings.length-1;j++)for(let k=0;k<6;k++){
      const i=(k+1)%6;
      tail.face([rings[j][k],rings[j+1][k],rings[j+1][i],rings[j][i]],
        [gold,orange,umber,ginger,umber,white,light][j]);
    }
    tail.face([...rings.at(-1)].reverse(),white);
    for(const side of [-1,1]){
      const w=part(side<0?7:8),a=[side*.008,0,.031],b=[side*.120,.018,.106],c=[side*.162,.023,.083],
        d=[side*.102,0,.006],e=[side*.079,0,-.047],f=[side*.017,0,-.062];
      w.face([a,b,c,d],"#f5ce65",true);w.face([a,d,e,f],"#e4aa4f",true);
      w.face([b,c,[side*.124,.022,.069]],"#7d6445",true);
      w.face([d,e,[side*.041,.004,-.008]],"#f6dd8e",true);
    }
    part(9).beam([0,.003,-.053],[0,.006,.066],.020,.021,"#805842");
  }

  const shader=`
    uniform vec4 uCatRoot,uCatGait,uCatLook;
    void poseGardenCat(inout vec3 p,inout vec3 n,vec3 pivot,float part,float opened){
      float phase=uCatGait.x,run=uCatGait.y,leap=uCatGait.w;
      if(part>6.5){
        float spread=smoothstep(158.,188.,uAngle);
        if(part<8.5){
          float s=part<7.5?-1.:1.;
          float flap=s*(.44+.70*sin(18.3*uTime+1.6*sin(2.1*uTime)));
          p=roll(p,flap);n=roll(n,flap);
        }
        float flutter=.57+.40*sin(uTime*2.76);
        p=turn(p,uTime*1.77)*spread+
          vec3(.18+.25*sin(uTime*2.25),.43+flutter*.34+.4*leap,.49+.09*cos(3.21*uTime));
        if(spread<.001)p.y=-2.;
      }else{
        if(part>1.5 && part<5.5){
          float timeShift=(part<2.5||part>4.5)?0.:3.14159;
          float beat=phase+timeShift+(part>3.5?.31:0.);
          float stretch=sin(beat)*.62*run+(part<3.5?-.90:.55)*leap;
          p=pivot+swing(p-pivot,stretch);n=swing(n,stretch);
          float lift=clamp((pivot.y-p.y)*4.3,0.,1.);
          p.y+=lift*(max(0.,cos(beat))*.074*run+uCatLook.w*.66);
        }else if(part>.5 && part<1.5){
          p=pivot+turn(swing(p-pivot,-uCatLook.y),uCatLook.x);
          n=turn(swing(n,-uCatLook.y),uCatLook.x);
        }else if(part>5.5){
          vec3 local=p-pivot;
          float w=smoothstep(.025,.36,length(local));
          float sway=uCatLook.z*w;
          p=pivot+turn(roll(local,sway*.59),sway);
          n=turn(roll(n,sway*.59),sway);
        }
        float bob=run*.025*(1.-cos(2.*phase));
        float foot=part>1.5&&part<5.5?smoothstep(.024,.27,p.y):1.;
        p.y+=foot*(bob-uCatLook.w);
        p=vec3(0.,.27,0.)+swing(p-vec3(0.,.27,0.),uCatGait.z);
        n=swing(n,uCatGait.z);p.y+=leap;
      }
      p*=.98*opened;
      p=uCatRoot.xyz+turn(p,uCatRoot.w);n=turn(n,uCatRoot.w);
    }`;
  return {build,pose,shader};
})();
