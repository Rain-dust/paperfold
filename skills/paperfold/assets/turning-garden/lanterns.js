"use strict";

globalThis.GardenLamps=(()=>{
  // World positions are shared by the glass lights, the wash on the paving
  // stones and the interactive switch on the tall post.
  const gate=[-1.73,1.48,4.03],stall=[1.55,1.33,4.00],garden=[-3.36,.95,-2.82];
  const lamps=[gate,stall,garden];
  function build(g){
    for(const [index,top] of lamps.entries()){
      const [x,y,z]=top, arm=index===1?-.28:.25;
      const post=g([x-arm,0,z],index===1?303:12,19,2);
      post.beam([x-arm,.015,z],[x-arm,y+.30,z],.083,.083,"#785d49");
      post.beam([x-arm,y+.27,z],[x,y+.27,z],.061,.060,"#936c47");
      post.beam([x-arm,y+.07,z],[x-.020*Math.sign(arm),y+.25,z],.032,.034,"#977749");
      post.box(x-arm-.062,.01,z-.064,.124,.145,.128,"#a6987e");
      const lamp=g([x,y+.27,z],index===1?311:18,14,10,index*.77).after(.83,post);
      const width=index===2?.098:.12;
      const pt=(i,s,h)=>[x+[-1,1,1,-1][i]*width*s,y+h,z+[-1,-1,1,1][i]*width*s];
      lamp.beam([x,y+.29,z],[x,y+.148,z],.021,.022,"#725a44");
      for(let i=0;i<4;i++){
        const j=(i+1)%4;
        lamp.face([pt(i,.77,-.18),pt(j,.77,-.18),pt(j,1,.037),pt(i,1,.037)],"#edbc75",false,true);
        lamp.face([pt(i,1.22,.034),pt(j,1.22,.034),pt(j,.37,.147),pt(i,.37,.147)],i%2?"#947150":"#796249");
        lamp.beam(pt(i,.78,-.18),pt(i,1,.039),.018,.018,"#6c5847");
        lamp.beam(pt(i,.78,-.18),pt(j,.78,-.18),.028,.026,"#785f48");
        lamp.beam(pt(i,1.22,.035),pt(j,1.22,.035),.018,.019,"#ac8861");
      }
      lamp.face([0,1,2,3].map(i=>pt(i,.79,-.183)),"#82674e");
    }
  }
  function grade(seconds){
    const x=Math.min(1,Math.max(0,(seconds-7.35)/3.95));
    return x*x*(3-2*x);
  }
  return {build,grade,lamps,gate};
})();
