"""產生方塊地形：把 38 區多邊形（已投影為 km）轉成 0.5 km 網格，輸出 data/terrain.js
來源：g0v/twgeojson twTown1982（內政部鄉鎮界），已簡化並投影，那瑪夏由舊「三民」拆出。
高度為示意，非真實海拔。"""
import json, math, base64, random, os, sys
here=os.path.dirname(os.path.abspath(__file__))
D=json.load(open(os.path.join(here,'districts.json'),encoding='utf-8'))
CELL=0.5
lat0=22.85; lon0=120.55; k=math.cos(math.radians(lat0))
def proj(lat,lon): return ((lon-lon0)*k*111.32, -(lat-lat0)*110.57)
# 每區：基準方塊數、起伏幅度
PROF={'鹽埕區':(1,0),'前金區':(1,0),'新興區':(1,0),'苓雅區':(1,0),'三民區':(1,0),'前鎮區':(1,0),'小港區':(1,0),
 '旗津區':(1,0),'左營區':(1,0),'楠梓區':(1,0),'鳳山區':(1,0),'鼓山區':(1,0),
 '茄萣區':(1,0),'永安區':(1,0),'彌陀區':(1,0),'梓官區':(1,0),'湖內區':(1,0),'路竹區':(1,1),'岡山區':(1,1),'橋頭區':(1,0),
 '林園區':(1,0),'大寮區':(1,1),'仁武區':(1,1),'鳥松區':(1,1),'大社區':(2,1),
 '阿蓮區':(2,2),'田寮區':(2,3),'燕巢區':(2,2),'大樹區':(2,2),'旗山區':(2,3),'內門區':(3,3),'美濃區':(2,2),'杉林區':(3,3),
 '甲仙區':(4,4),'六龜區':(4,5),'茂林區':(5,5),'那瑪夏區':(6,6),'桃源區':(6,7)}
REG={}
for n in '湖內 茄萣 路竹 阿蓮 田寮 燕巢 岡山 橋頭 永安 彌陀 梓官 楠梓 左營'.split(): REG[n+'區']='north'
for n in '鳳山 大社 仁武 鳥松 大樹 旗山 美濃 內門 杉林 六龜 甲仙 那瑪夏 茂林 桃源 大寮 林園'.split(): REG[n+'區']='east'
for n in '三民 鼓山 鹽埕 前金 新興 苓雅'.split(): REG[n+'區']='core'
for n in '旗津 前鎮 小港'.split(): REG[n+'區']='port'
names=[d['n'] for d in D]
assert len(names)==38 and set(names)==set(REG), set(REG)^set(names)
xs=[p[0] for d in D for r in d['r'] for p in r]; ys=[p[1] for d in D for r in d['r'] for p in r]
x0=math.floor(min(xs))-1; y0=math.floor(min(ys))-1; W=int((max(xs)-x0)/CELL)+3; H=int((max(ys)-y0)/CELL)+3
def inpoly(x,y,ring):
    ins=False; j=len(ring)-1
    for i in range(len(ring)):
        xi,yi=ring[i]; xj,yj=ring[j]
        if (yi>y)!=(yj>y) and x<(xj-xi)*(y-yi)/(yj-yi)+xi: ins=not ins
        j=i
    return ins
bbs=[]
for d in D:
    bbs.append([(min(p[0] for p in r),min(p[1] for p in r),max(p[0] for p in r),max(p[1] for p in r)) for r in d['r']])
random.seed(7)
# 平滑雜訊
G=[[random.random() for _ in range(64)] for _ in range(64)]
def vnoise(x,y):
    xi,yi=int(math.floor(x)),int(math.floor(y)); fx,fy=x-xi,y-yi
    fx=fx*fx*(3-2*fx); fy=fy*fy*(3-2*fy)
    g=lambda a,b:G[a%64][b%64]
    return (g(xi,yi)*(1-fx)+g(xi+1,yi)*fx)*(1-fy)+(g(xi,yi+1)*(1-fx)+g(xi+1,yi+1)*fx)*fy
def fbm(x,y): return vnoise(x/6,y/6)*.6+vnoise(x/2.5,y/2.5)*.3+vnoise(x,y)*.1
shou=proj(22.640,120.272)  # 壽山
dist=bytearray([255])*(W*H); hgt=bytearray(W*H)
for j in range(H):
    for i in range(W):
        x=x0+(i+.5)*CELL; y=y0+(j+.5)*CELL
        for di,d in enumerate(D):
            hit=False
            for r,(a,b,c,e) in zip(d['r'],bbs[di]):
                if a<=x<=c and b<=y<=e and inpoly(x,y,r): hit=True;break
            if hit:
                n=d['n']; base,amp=PROF[n]
                h=base+round(amp*fbm(x,y)*1.6)
                if n in('桃源區','那瑪夏區','茂林區','六龜區'): h+=max(0,round((x-10)/6))  # 往中央山脈漸高
                if n=='鼓山區' and math.hypot(x-shou[0],y-shou[1])<2.6: h+=3 - round(math.hypot(x-shou[0],y-shou[1]))
                dist[j*W+i]=di; hgt[j*W+i]=max(1,min(18,h)); break
cnt={}
for v in dist:
    if v!=255: cnt[v]=cnt.get(v,0)+1
missing=[names[i] for i in range(38) if i not in cnt]
print('grid',W,H,'cells',sum(cnt.values()),'missing',missing)
out={'cell':CELL,'x0':x0,'y0':y0,'w':W,'h':H,'lat0':lat0,'lon0':lon0,
     'names':names,'region':[REG[n] for n in names],
     'd':base64.b64encode(bytes(dist)).decode(),'hgt':base64.b64encode(bytes(hgt)).decode()}
open(os.path.join(here,'..','data','terrain.js'),'w',encoding='utf-8').write('// 由 tools/build_terrain.py 產生，勿手改\nexport const TERRAIN='+json.dumps(out,ensure_ascii=False)+';\n')
