"use strict";

globalThis.GardenLife = (() => {
  const tau=2*Math.PI, rad=Math.PI/180;
  const duration=12, opening=10;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const smooth=v=>{const x=clamp(v);return x*x*(3-2*x);};
  const mix=(a,b,k)=>a+(b-a)*k;
  // Angular velocity is continuous through each of the scenic beats.
  const beats=[[0,0,0],[.7,17,43],[2.8,102,38],[4.55,164,31],[7.1,252,39],[8.95,326,43],[opening,360,0]];
  function angleAt(t){
    if(t<=0)return 0;
    for(let i=1;i<beats.length;i++){
      const [end,b,v1]=beats[i], [start,a,v0]=beats[i-1];
      if(t>end)continue;
      const d=end-start,u=(t-start)/d;
      return mix(a,b,smooth(u))+d*(v0*u*(1-u)*(1-u)-v1*u*u*(1-u));
    }
    return 360;
  }
  function timeAt(angle){
    let lo=0,hi=opening;
    for(let i=0;i<18;i++){
      const mid=(lo+hi)/2;
      if(angleAt(mid)<angle)lo=mid;else hi=mid;
    }
    return (lo+hi)/2;
  }
  function pulse(age,rise,decay){
    return age>=0?smooth(age/rise)*Math.exp(-Math.max(age-rise,0)/decay):0;
  }
  function breeze(time){
    return .57+.26*Math.sin(time*1.62-.65)+.13*Math.cos(time*2.73+.5);
  }
  function spinAt(time){
    return 3.7*time-.74*Math.cos(time*1.62-.65)+.18*Math.sin(time*2.73+.5);
  }
  function flightPoint(a,t,lift){
    const takeoff=smooth((a-1)/40),follow=smooth((a-264)/87);
    const az=208*rad+(a-24*takeoff)*rad;
    const r=mix(3.91,3.77+.43*Math.sin(.98*t),takeoff);
    const pursuit=[r*Math.sin(az),mix(4.35,2.25+.48*Math.sin(t*1.49),takeoff)+.8*Math.sin(takeoff*Math.PI),r*Math.cos(az)];
    const phase=t*.96-8.05;
    const x=1.00+2.92*Math.cos(phase),z=1.50+2.12*Math.sin(phase);
    const loop=[x,2.47+.37*Math.sin(phase*2+.3)+1.66*smooth((1.6-x)/2.4),z];
    return pursuit.map((v,i)=>mix(v,loop[i],follow)+(i===1?lift*.85:i===2?lift*.24:0));
  }
  function birdPose(a,t,angleSpeed,callAge){
    const lift=pulse(callAge,.28,.89);
    const pos=flightPoint(a,t,lift),dt=.025;
    const ahead=flightPoint(clamp(a+angleSpeed*dt,0,360),t+dt,pulse(callAge+dt,.28,.89));
    const [dx,dy,dz]=ahead.map((v,i)=>v-pos[i]);
    const airborne=smooth((a-1)/17),heading=Math.atan2(dx,dz);
    // Turn from the perch tangent continuously, including the -pi/pi seam.
    const perch=298*rad,delta=Math.atan2(Math.sin(heading-perch),Math.cos(heading-perch));
    const strokes=.62+.31*Math.cos(t*2.34);
    const wing=mix(1.29,.08+strokes*Math.sin(t*11.6+.28*Math.sin(t*3.2))+lift*.20,airborne);
    const bank=airborne*(.20+.16*Math.sin(1.41*t)+.28*lift);
    const pitch=airborne*clamp(Math.atan2(dy,Math.hypot(dx,dz)),-.40,.47);
    return {pos,pose:[perch+airborne*delta,pitch,bank,wing]};
  }
  const wheel=[3.65,2.10,2.49];
  function windmill(g){
    const [x,y,z]=wheel;
    const stand=g([x,0,z],205,16,2);
    stand.beam([x-.05,.025,z+.02],[x,y+.07,z],.079,.079,"#92724c");
    stand.beam([x-.034,.16,z+.058],[x+.014,y+.055,z+.04],.017,.020,"#ddc394");
    stand.box(x-.14,.0,z-.12,.27,.15,.25,"#b49f78");
    const hub=[x,y,z+.084],wheelMesh=g(hub,214,15,4).after(.84,stand);
    const paint=[["#d66d54","#f6ba83"],["#438881","#8cbcaf"],["#dfaa52","#f9d99a"],["#b85f49","#e59775"]];
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2;
      const p=(u,v,d)=>[hub[0]+u*Math.cos(a)-v*Math.sin(a),hub[1]+u*Math.sin(a)+v*Math.cos(a),hub[2]+d];
      const foot=p(.015,.008,.026),tip=p(-.18,.57,.044),corner=p(.155,.46,-.038),fold=p(.096,.26,.091);
      wheelMesh.face([foot,tip,fold],paint[i][0]);wheelMesh.face([fold,tip,corner],paint[i][1]);
      wheelMesh.face([foot,fold,corner],i%2?"#e6cfa3":"#a95d49");
    }
    const pin=g(hub,215,11,2).after(.6,wheelMesh);
    pin.beam([x,y,hub[2]-.04],[x,y,hub[2]+.12],.098,.096,"#e7be73");
  }
  function garland(g){
    const a=[-4.28,1.25,-1.94],b=[-4.36,1.61,.86];
    const at=u=>a.map((v,i)=>mix(v,b[i],u)-(i===1?.25*Math.sin(u*Math.PI):0));
    const posts=[a,b].map(p=>{
      const base=g([p[0],0,p[2]],18,17,2);
      base.beam([p[0],.022,p[2]],p,.053,.055,"#91714f");
      return base;
    });
    const rope=g(at(.5),67,14,2).after(.77,...posts);
    for(let i=0;i<12;i++)rope.beam(at(i/12),at((i+1)/12),.018,.018,"#a6895f");
    const colors=["#b45d4f","#e2b369","#5e9995","#e6c99c"];
    for(let i=0;i<8;i++){
      const u=.045+i*.118,l=at(u),r=at(u+.09),p=at(u+.045);
      const flag=g(p,70+i*.9,12,5,0,i*.58).after(.61,rope);
      const tip=[p[0]+.055,p[1]-.28-(i%2)*.043,p[2]+.062];
      const fold=[p[0]+.036,p[1]-.103,p[2]+.023];
      flag.face([l,r,fold],colors[i%4]);
      flag.face([l,fold,tip],colors[i%4]);
      flag.face([r,tip,fold],["#d17a63","#edc78a","#7aafa6","#f3d9a8"][i%4]);
    }
  }
  function borders(g,angle){
    const palettes=[["#cf786c","#f2aea0"],["#ead6a0","#fff0be"],["#c98986","#eed0bb"]];
    for(const [cx,cz,n] of [[-2.49,-3.31,13],[.35,-3.53,15],[2.29,-2.60,17],[3.57,.99,8],[2.11,3.42,8],[-3.56,2.63,10]]){
      for(let i=0;i<n;i++){
        const a=i*2.399+cx*.3,r=.174*Math.sqrt(i);
        const x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r*.70;
        const h=.24+.18*(.5+.5*Math.cos(i*3.94+cz)),p=[x,.012,z];
        const stem=g(p,angle(x,z)+4,15,2,0,1.31);
        const head=[x+.058*Math.cos(a),h,z+.058*Math.sin(a)];
        stem.beam(p,head,.017,.013,"#64794e");
        for(const k of [-1,1]){
          const base=[x,h*.28,z];
          stem.face([base,[x+k*.095,h*.64,z+k*.04],[x+k*.13,h*.77,z+k*.002],[x+k*.05,h*.42,z-.023]],"#8a9d63",true);
        }
        const paint=palettes[(i+Math.floor(Math.abs(cz)))%3];
        for(let k=0;k<5;k++){
          const th=a+k*tau/5;
          const petal=(r,d,y)=>[head[0]+r*Math.cos(th)-d*Math.sin(th),h+y,head[2]+r*Math.sin(th)+d*Math.cos(th)];
          stem.face([head,petal(.047,-.031,.025),petal(.082,-.010,.057),petal(.078,.018,.047),petal(.044,.033,.022)],paint[k%2],true);
        }
        stem.face([[head[0]-.023,h+.019,head[2]],[head[0],h+.032,head[2]-.022],[head[0]+.025,h+.023,head[2]],[head[0],h+.026,head[2]+.021]],"#d79848",true);
      }
    }
  }
  function petals(g,trunk){
    for(let i=0;i<13;i++){
      const a=i*2.40,x=3.10+.63*Math.cos(a),z=.37+.61*Math.sin(a),y=1.82+.37*Math.sin(i*.92);
      const leaf=g([x,y,z],262+i*.45,16,6,0,i*.618).after(.89,trunk);
      const p=(dx,dy,dz)=>[x+dx,y+dy,z+dz];
      leaf.face([p(-.075,0,0),p(-.026,.034,.038),p(.065,.016,.016),p(.041,.008,-.027)],i%3?"#ecc2a4":"#ca846a",true);
    }
  }
  function swallow(g){
    const m=g([0,0,0],-2,1,7);
    const nose=[0,.035,.34],back=[0,.108,-.01],belly=[0,-.061,.015];
    for(const s of [-1,1]){
      const root=[s*.102,.028,-.062],shoulder=[s*.081,.045,.130],tail=[s*.041,.032,-.235];
      m.face([nose,shoulder,back],"#395f67");m.face([nose,belly,shoulder],"#d19970");
      m.face([shoulder,root,back],s>0?"#426b72":"#577f82");m.face([root,shoulder,belly],"#f0d5aa");
      m.face([root,tail,back],"#48666a");m.face([root,belly,tail],"#e1c7a1");
      const elbow=[s*.39,.095,.084],fold=[s*.32,.049,-.066],tip=[s*.67,.085,-.25];
      m.face([shoulder,elbow,fold],"#6d9e9c");m.face([shoulder,fold,root],"#496e74");
      m.face([elbow,tip,fold],"#396971");m.face([fold,tip,[s*.33,.027,-.167],root],"#85b4ab");
      m.face([tail,[s*.148,.043,-.416],[s*.105,.050,-.207],root],"#44696d");
      m.face([[s*.067,.064,.157],[s*.066,.072,.183],[s*.060,.078,.164]],"#342c29");
      m.face([nose,[0,.008,.397],[s*.047,.012,.282]],"#a36e45");
    }
  }
  return {duration,opening,angleAt,timeAt,pulse,breeze,spinAt,birdPose,wheel,windmill,garland,borders,petals,swallow};
})();
