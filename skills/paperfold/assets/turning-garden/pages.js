"use strict";

globalThis.GardenPages = (() => {
  const width=768,height=640,tau=2*Math.PI;
  function random(i){
    const n=Math.sin(i*123.47+12.67)*43758.545;
    return n-Math.floor(n);
  }
  function path(p,d,fill,stroke,w=1){
    const shape=new Path2D(d);
    if(fill){p.fillStyle=fill;p.fill(shape);}
    if(stroke){p.strokeStyle=stroke;p.lineWidth=w;p.stroke(shape);}
  }
  function ellipse(p,x,y,rx,ry,fill,stroke,w=1,rotation=0){
    p.beginPath();p.ellipse(x,y,rx,ry,rotation,0,tau);
    if(fill){p.fillStyle=fill;p.fill();}
    if(stroke){p.strokeStyle=stroke;p.lineWidth=w;p.stroke();}
  }
  function line(p,points,stroke,w=1){
    p.lineWidth=w;p.strokeStyle=stroke;p.beginPath();
    points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));
    p.stroke();
  }
  function stock(p,cover){
    const grd=p.createLinearGradient(0,0,width,height);
    const colors=cover?["#314e4d","#56736a","#47625b"]:["#e8d9ba","#faf0d8","#ede1c6"];
    colors.forEach((v,i)=>grd.addColorStop(i*.5,v));p.fillStyle=grd;p.fillRect(0,0,width,height);
    // Laid paper has long, irregular fibres and short lint. The cover has a
    // subtle cloth grain, so its metallic details stay distinct in a wide shot.
    const shades=cover?["#e1dcc329","#132c2b20","#adbc9f25"]:["#886e491c","#fff9e84a","#ae92561e"];
    for(let n=0;n<6100;n++){
      const x=random(n*19+11)*width,y=random(n*13+12)*height;
      p.fillStyle=shades[n%3];p.fillRect(x,y,.8+random(n+15)*2.4,.55+random(n+31)*1.1);
      if(n%4===0){
        const d=3+random(n*7+41)*9,k=(random(n+26)-.5)*4;
        line(p,[[x,y],[x+d*.63,y+k],[x+d,y+k*.78]],shades[n%3],.6);
      }
    }
    if(cover){
      for(let x=0;x<width;x+=3.4)line(p,[[x,0],[x+.7,height]],"#faf0d213",.66);
      for(let y=0;y<height;y+=3.6)line(p,[[0,y],[width,y+.35]],"#233b3417",.69);
    }
    const fold=p.createLinearGradient(0,0,65,0);
    fold.addColorStop(0,cover?"#203b3dc4":"#77634557");fold.addColorStop(.35,cover?"#40584f60":"#b09b7630");fold.addColorStop(1,"#b09b7600");
    p.fillStyle=fold;p.fillRect(0,0,65,height);
    if(cover){line(p,[[35,0],[35,height]],"#e1d5ab60",1.3);line(p,[[40,0],[40,height]],"#253f38ad",2.4);}
  }
  function frame(p,cover){
    const color=cover?"#e6c797":"#b3976f9c",inside=cover?"#bc9f778a":"#aa916d63";
    const left=cover?57:32,right=width-29,top=26,bottom=height-top;
    const cut=13;
    const border=(gap)=>line(p,[[left+cut+gap,top+gap],[right-cut-gap,top+gap],[right-gap,top+cut+gap],
      [right-gap,bottom-cut-gap],[right-cut-gap,bottom-gap],[left+cut+gap,bottom-gap],
      [left+gap,bottom-cut-gap],[left+gap,top+cut+gap],[left+cut+gap,top+gap]],gap?inside:color,gap?.9:1.6);
    border(0);border(5);
    for(const [x,s] of [[left,1],[right,-1]])for(const [y,k] of [[top,1],[bottom,-1]]){
      p.save();p.translate(x,y);p.scale(s,k);
      path(p,"M 12 32 Q 14 15 34 12 M 13 24 Q 26 29 32 16 M 22 16 Q 21 26 16 31",null,color,1.1);
      ellipse(p,38,12,1.7,1.7,color);p.restore();
    }
  }
  function leaf(p,x,y,angle,size,fill,vein,widthRatio=.30){
    p.save();p.translate(x,y);p.rotate(angle);p.scale(size,size);
    const d=widthRatio;
    p.beginPath();p.moveTo(0,0);p.bezierCurveTo(-d*.55,-.12,-d,-.64,0,-1);
    p.bezierCurveTo(d*.25,-.86,d*1.2,-.35,0,0);p.fillStyle=fill;p.fill();
    if(vein){p.strokeStyle=vein;p.lineWidth=.035;p.beginPath();p.moveTo(0,-.015);p.quadraticCurveTo(d*.21,-.46,0,-.90);p.stroke();}
    p.restore();
  }
  function sprig(p,x,y,length,rotation,ink,fill,alternate){
    p.save();p.translate(x,y);p.rotate(rotation);p.scale(length/150,length/150);
    path(p,"M0 0 Q 6 -78 24 -149",null,ink,1.55);
    for(let i=0;i<6;i++){
      const t=(i+.6)/7,bx=4*t+18*t*t,by=-147*t;
      const s=1-i*.085;
      leaf(p,bx,by,-.88+i*.025,30*s,fill,ink);
      leaf(p,bx+1,by-7,.91-i*.025,31*s,alternate,ink);
    }
    leaf(p,23,-140,.23,23,fill,ink);
    p.restore();
  }
  function bloom(p,x,y,size,tint,core,seed){
    for(let i=0;i<7;i++){
      const a=i*tau/7+seed;
      ellipse(p,x+Math.cos(a)*size*.54,y+Math.sin(a)*size*.54,size*.49,size*.205,
        tint,i%2?null:"#976e514f",.55,a);
    }
    ellipse(p,x,y,size*.244,size*.205,core);
    ellipse(p,x-size*.04,y-size*.065,size*.07,size*.055,"#fff0c9");
  }

  function coverArt(p){
    const gold=p.createLinearGradient(210,140,540,508);
    gold.addColorStop(0,"#bb9269");gold.addColorStop(.37,"#efd6a6");gold.addColorStop(.54,"#b8956c");gold.addColorStop(.82,"#e1bd89");gold.addColorStop(1,"#9d8061");
    const center=[399,307];
    ellipse(p,...center,178,184,null,"#283f3875",3.6);
    ellipse(p,...center,175,182,null,gold,2.1);
    ellipse(p,...center,166,173,null,"#e2c19270",1.0);
    for(const s of [-1,1]){
      for(let j=-2;j<=2;j++){
        const y=center[1]+j*6, x=center[0]+s*(180+Math.abs(j)*.35);
        line(p,[[x,y],[x+s*(j===0?19:5.5),y]],gold,j===0?1.8:1);
      }
    }
    // A gilt, cut-paper swallow. Contrasting folds still read at oblique angles.
    p.save();p.translate(400,290);p.rotate(-.13);
    const pieces=[
      ["M-4 8 Q-44 -14 -83 -83 Q-72 -34 -71 -20 L-40 15 L-11 26Z","#dce0c7"],
      ["M-4 8 L-83 -83 Q-41 -55 -12 -26 L12 0Z","#96b7ab"],
      ["M-83 -83 L-49 -42 L-12 -26 Q-39 -50 -83 -83Z","#e4d5b2"],
      ["M-7 9 Q1 -40 39 -108 Q27 -59 29 -28 L14 8Z","#e6c492"],
      ["M-7 9 L39 -108 Q1 -63 -13 -22 L-19 11Z","#b58c64"],
      ["M-66 68 L-38 27 Q-48 34 -94 56 L-44 13 L-11 0 Q4 -8 17 -10 Q25 -23 40 -25 Q53 -28 62 -19 L78 -17 L61 -12 Q55 2 30 10 Q9 25 -30 25Z","#e2ceac"],
      ["M-94 56 L-44 13 L-9 2 L18 -10 Q27 -22 42 -24 Q51 -25 59 -19 L47 -14 Q27 -15 14 -1 L-34 18Z","#789b95"],
      ["M-66 68 L-38 27 L-6 16 L-30 25Z","#a9c1ad"],
      ["M31 -3 Q47 -14 61 -12 Q48 3 30 9Z","#c68668"]
    ];
    for(const [d,c] of pieces)path(p,d,c,"#3a514b",1.05);
    ellipse(p,49,-18,1.8,1.6,"#364840");
    p.restore();
    // Curled orchard twigs form a loose wreath across only the lower rim.
    sprig(p,395,457,105,-1.04,"#c6ad84","#94ad91","#648877");
    sprig(p,389,457,118,.92,"#d5b58a","#a7b99c","#80a189");
    sprig(p,363,447,74,-1.43,"#c1ad82","#87a18b","#739381");
    for(const [x,y,r] of [[342,426,5.3],[352,438,4.1],[449,425,5.4],[460,417,4.3],[421,446,4.4]]){
      ellipse(p,x,y,r,r*.93,"#ca8d70","#e8c199",.8);ellipse(p,x-1.4,y-1.3,.9,.72,"#f3d6ac");
    }
    for(const [x,y,r] of [[328,226,2.8],[345,218,1.7],[463,239,2.1],[468,301,1.5],[292,316,2.3],[441,188,1.6]]){
      path(p,`M${x-r*1.5} ${y}q${r} -.4 ${r*1.5} ${-r*1.7}q.4 ${r} ${r*1.5} ${r*1.7}q${-r} .4 ${-r*1.5} ${r*1.7}q-.4 ${-r} ${-r*1.5} ${-r*1.7}`,gold);
    }
    path(p,"M386 535 Q398 530 409 535 Q398 540 386 535Z",gold);
    line(p,[[347,535],[378,535]],gold,1.1);line(p,[[418,535],[449,535]],gold,1.1);
  }

  function windowBox(p,x,y,w,h){
    p.fillStyle="#a7b5a2";p.fillRect(x,y,w,h);
    p.strokeStyle="#887556";p.lineWidth=2;p.strokeRect(x,y,w,h);
    line(p,[[x+w*.5,y],[x+w*.5,y+h]],"#8c795c",1.5);
    line(p,[[x,y+h*.47],[x+w,y+h*.47]],"#8c795c",1.5);
    line(p,[[x-3,y+h+2],[x+w+3,y+h+2]],"#a08261",2.7);
  }
  function elevation(p){
    p.save();p.globalAlpha=.81;p.translate(96,75);
    const timber="#9e8061";
    path(p,"M112 261 L300 222 L423 266 L423 368 L302 394 L112 350Z","#d5c19e","#9c8568",1.75);
    path(p,"M113 263 L201 156 L301 229 L301 394 L112 350Z","#e1caa4","#ad8c65",1.8);
    path(p,"M301 229 L423 199 L423 366 L301 394Z","#cab697","#a38a66",1.7);
    for(const u of [.08,.31,.56,.80,.98]){
      const x=112+189*u,z=350+44*u;
      line(p,[[x,z-109],[x,z]],timber,2.9);
    }
    for(const u of [.10,.49,.92]){
      const x=301+122*u,y=394-28*u;line(p,[[x,y-113],[x,y]],timber,2.6);
    }
    for(const d of [54,105]){
      line(p,[[112,350-d],[301,394-d],[423,366-d]],timber,3);
    }
    for(let i=0;i<4;i++){
      const x=117+i*46,y=347+i*11;
      line(p,[[x,y-5],[x+41,y-41]],"#a88d6b",2.2);
    }
    line(p,[[125,252],[200,167],[294,246]],timber,3.4);
    line(p,[[157,229],[278,255]],timber,2.8);
    line(p,[[199,168],[199,236]],timber,2.7);
    line(p,[[199,202],[175,230]],timber,1.9);
    line(p,[[199,202],[233,245]],timber,1.9);
    windowBox(p,142,263,25,26);windowBox(p,229,285,29,28);
    windowBox(p,341,290,22,27);windowBox(p,386,277,19,25);
    path(p,"M199 369 L199 324 Q210 316 222 329 L222 374Z","#a39176",timber,1.55);
    path(p,"M92 258 L197 133 L223 137 L319 229 L303 240 L201 161 L109 267Z","#c38b72","#947459",2.1);
    path(p,"M197 133 L322 111 L454 199 L319 230Z","#cc967b","#9c785b",2.0);
    const roof=new Path2D("M197 133 L322 111 L454 199 L319 230Z");
    p.save();p.clip(roof);
    for(let row=0;row<10;row++){
      const v=row/9;
      const x=197+v*122,y=133+v*97;
      line(p,[[x,y],[x+140,y-28]],"#af816966",1.2);
      for(let k=-1;k<12;k++){
        const xx=x+k*14+(row%2)*6,yy=y-(xx-x)*.20;
        path(p,`M${xx} ${yy}q2 6 8 9q4 2 7 -3`,null,"#aa7c635f",.95);
      }
    }
    p.restore();
    path(p,"M331 145 L331 114 L344 112 L352 118 L352 159Z","#b3a68c","#95866e",1.15);
    path(p,"M328 112 L344 109 L355 115 L353 120 L328 117Z","#aaa18c","#95866e",1.05);
    path(p,"M339 104 Q322 89 344 78 Q358 70 351 57",null,"#aeac965e",2.5);
    line(p,[[96,352],[300,401],[437,368]],"#a88e6a",1.8);
    for(let i=0;i<33;i++){
      const x=93+i*10,y=x<301?355+(x-93)*.225:402-(x-301)*.238;
      line(p,[[x,y+4],[x+6,y+1]],"#9c8e715a",1.0);
    }
    p.restore();
    p.save();p.globalAlpha=.69;
    sprig(p,639,511,88,-.7,"#9d977d","#abb596","#91a186");
    sprig(p,638,511,107,.13,"#9a8d72","#a5b093","#b6b68c");p.restore();
  }

  function specimens(p){
    p.save();p.globalAlpha=.86;
    // Three specimens, with their own stems, leaf forms and inflorescences.
    const ink="#8a9172";
    sprig(p,261,444,180,-.23,ink,"#9fab8a","#b1b89c");
    sprig(p,259,440,113,-.83,ink,"#a6ae90","#b2bc9d");
    sprig(p,261,431,118,.34,ink,"#acb59b","#90a18c");
    path(p,"M385 457 C380 401 412 312 387 206 M389 396 Q359 355 344 328 M397 327 Q428 301 439 260 M395 300 Q370 267 366 243",null,"#919277",2.1);
    for(const [x,y,a,n] of [[385,416,-.99,37],[393,379,.86,41],[399,342,-.70,30],[356,350,-.99,28],[423,291,.95,34],[390,265,.74,28]]){
      leaf(p,x,y,a,n,"#a8b299","#899a81",.34);
    }
    for(const [x,y,s] of [[386,201,17],[344,325,12],[440,257,13],[364,240,10]]){
      bloom(p,x,y,s,"#e3ad93","#bda05f",s*.18);
    }
    path(p,"M500 448 Q520 371 500 323 Q487 284 510 244 M501 393 Q479 376 475 346 M506 355 Q535 329 541 301",null,ink,2);
    for(let i=0;i<5;i++){
      leaf(p,504+(i%2)*2,397-i*26,i%2?.96:-.89,30-i*1.8,"#a7b397","#8a9b7d",.43);
    }
    for(const [x,y,k] of [[509,242,1.0],[540,300,.75],[473,346,.68]]){
      path(p,`M${x-9*k} ${y-27*k}q${k*18} -2 ${k*23} ${k*20}q${-k} ${k*15} ${-k*12} ${k*18}q${-k*18} ${-k*1} ${-k*18} ${-k*15}q0 ${-k*17} ${k*7} ${-k*23}Z`,"#d19a80","#ac8d70",1);
      for(let j=0;j<9;j++){const a=(j%3)*4;ellipse(p,x-5*k+a*k,y-12*k+Math.floor(j/3)*5*k,1,.8,"#ead2a5");}
      for(const a of [-.94,-.31,.58])leaf(p,x,y-20*k,a,11*k,"#95a37e",null);
    }
    for(const [x,y] of [[258,427],[387,432],[500,427]]){
      p.save();p.translate(x,y);p.rotate(-.14);
      p.fillStyle="#cbbb986d";p.fillRect(-14,-2,29,8);p.restore();
      line(p,[[x-15,479],[x+15,479]],"#ad97756b",1);
      ellipse(p,x,489,1.65,1.4,"#b79e77a8");
    }
    p.restore();
  }
  function produce(kind){
    const c=document.createElement("canvas");c.width=width;c.height=height;
    const p=c.getContext("2d");p.lineJoin="round";p.lineCap="round";
    stock(p,kind===2);frame(p,kind===2);
    if(kind===2)coverArt(p);
    else if(kind===0)elevation(p);
    else specimens(p);
    return c;
  }
  return {produce};
})();
