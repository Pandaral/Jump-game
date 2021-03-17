var Game=function()
{
    //游戏中的一些基本参数设置
    this.config={
        height:2,//每个方块的高度
        background:0x282828,//背景色
        ground:-1,//地面的位置
        cubeheight:2,//长方体的高
        cubewidth:4,//长方体的宽
        cubelong:4,//长方体的长
        jumperwidth:1,//jumper的宽
        jumperheight:2,//jumper的高
        jumperlong:1,//jumper的长
        state:'',//游戏状态，游戏成功或失败
        cubeColor:'' //创建的方块的颜色
    }
    //游戏状态
    this.score=0;
    this.tableNum=[]; //记录跳过的台子数
    this.size={
        width:window.innerWidth,
        height:window.innerHeight,
    }
    this.fallconfig={
        //axis:new THREE.Vector3(),//jumper旋转时绕着旋转的旋转轴
        dir:'',//下一个物体块相对于当前所在物体块的方向
        ready:false,
        jumpx:0,//物体在点击鼠标之后应该在X轴弹跳的距离
        jumpy:0,//同上
        jumpz:0,//同上
        distance:0,//离jumper最近的方块与jumper的距离
        angle:0,//jumper掉落时旋转过的角度
        end:false,//判断jumper掉到地面上了没有
        FallingWay:'',//jumper要掉落的方式
        posNext:0,//下一个台子的坐标
        nextJumpTime:0,// 跳到下一个台子上所需时间
    }
    this.camerapos={
        current:new THREE.Vector3(0,0,0),//照相机当前的位置
        next:new THREE.Vector3(),//摄像机即将要移动到的位置
    }
    this.camera=new THREE.OrthographicCamera(this.size.width/-80,this.size.width/80,this.size.height/80,this.size.height/-80,0,5000);
    this.scene=new THREE.Scene();
    this.renderer=new THREE.WebGLRenderer();
    this.cubes=[];
    this.fakeCubes=[];//假的台子的队列
    // this.jumper;//弹跳者
}
Game.prototype={
    init:function(){
        this._initcamera()//设置好相机的一些属性
        this._initrender()//初始化渲染器
        this._initLight()//初始化光
        this._createcube()//生成场景中的一个物体块
        this._createcube()//再在场景中生成一个物体块
        this._createjumper()//生成弹跳的物体
        this._updateCamera()//更新照相机位置
        this._createFakecube()//创建假的台子
        // this._render();
        var self=this;
        var canvas=document.querySelector('canvas');
        var mouseevents={
            down:'mousedown',
            up:'mouseup',
        }
        canvas.addEventListener(mouseevents.down,function(){self._handlemousedown()},false);
        canvas.addEventListener(mouseevents.up,function(){self._handlemouseup()},false);
        window.addEventListener("resize",function(){self.onWindowResize()},false);
    },
    //游戏失败之后重新开始的初始化设置
    restart:function()
    {
        this.score=0;
        this.tableNum=[];
        this.camerapos={
            current:new THREE.Vector3(0,0,0),
            next:new THREE.Vector3(),
        }
        this.fallconfig.end=false;
        var length=this.cubes.length;
        for(var i=0;i<length;i++)
        {
            this.scene.remove(this.cubes.pop());
        }
        this.scene.remove(this.jumper);
        this.successCallBack(this.score);
        this._createcube();
        this._createcube();
        this._createjumper();
        this._updateCamera();
        this._createFakecube();
    },
    onWindowResize:function()
    {
        this._setsize();
        this.camera.left=this.size.width/-80;
        this.camera.right=this.size.width/80;
        this.camera.top=this.size.height/80;
        this.camera.bottom=this.size.height/-80;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.size.width,this.size.height);
        this._render();
    },
    //游戏成功的执行函数，由外部传入
    addSucessFn:function(fn)
    {
        this.successCallBack=fn;
    },
    //游戏失败的执行函数，由外部传入
    addFailedFn:function(fn)
    {
        this.failedCallBack=fn;
    },
    _handlemousedown:function()
    {
        var self=this;
        if(!self.fallconfig.ready&&self.jumper.scale.y>0.02)
        {
            self.jumper.scale.y-=0.01;
            self.fallconfig.jumpx+=0.006;//鼠标按下越久在对应方向上要跳的距离越大
            self.fallconfig.jumpy+=0.008;//同上
            self.fallconfig.jumpz+=0.006;//同上
            self._render(self.scene,self.camera);
            requestAnimationFrame(function(){self._handlemousedown()});
        }
    },
    _handlemouseup:function()
    {
        var self=this;
        self.fallconfig.ready=true;
        if(self.jumper.position.y>=2)
        {
            if(self.fallconfig.dir=='left')
            {
                self.jumper.position.x-=self.fallconfig.jumpx;
            }
            else
            {
                self.jumper.position.z-=self.fallconfig.jumpz;
            }
            if(self.jumper.scale.y<1)
            {
                self.jumper.scale.y+=0.02;//恢复原状（jumper)
            }
            self.jumper.position.y+=self.fallconfig.jumpy;
            self.fallconfig.jumpy-=0.01;
            self._render(self.scene,self.camera);
            requestAnimationFrame(function(){self._handlemouseup()});
        }
        else
        {
            self.fallconfig.ready=false;
            self.fallconfig.jumpx=0;
            self.fallconfig.jumpy=0;
            self.fallconfig.jumpz=0;
            self.jumper.scale.y=1;
            self.jumper.position.y=2;
            self._checkincube();//检测jumper的掉落是否在物体块上此时
            if(self.config.state=='next')//jumper成功跳到下一个方块上
            {
                //判断方块的颜色，是粉色就给加五分，不是就加一分
                // console.log("当前方块颜色："+this.config.cubeColor);
                if(this.config.cubeColor == 'pink'){
                    self.score+=5;
                }else{
                    self.score++;
                }
                self._createcube();//再往场景中添加一个物体
                self._createFakecube();//再往场景中添加一个假的物体
                self._updateCamera();//更新照相机看的位置，保证相机一直紧盯物体
                if(self.successCallBack){
                    autoJump.calSuccessProb();// 计算下一次跳跃成功的概率
                    autoJump.calculateTime();// 计算下一次跳跃所需要按下鼠标的时间
                    self.successCallBack(self.score);//掉落成功，改变分数
                }
            }
            else if(self.config.state=='current')//jumper落在了原来所在的方块之上
            {
                self.fallconfig.jumpx=0;
                self.fallconfig.jumpy=0;
                self.fallconfig.jumpz=0;
                self.jumper.position.y=2;
            }
            else
            {
                self._falling();//jumper跳失败，开始掉落
            }
        }
    },
    _falling:function()
    {
        // debugger;
        var self=this;
        //var offset=self.fallconfig.distance-self.config.cubewidth/2;
        if(self.fallconfig.FallingWay=='CubeLeftEdge'&&self.fallconfig.angle<Math.PI/2)
        {
            //jumper.translateX(offset);//沿着x轴正方向平移
            self.jumper.rotation.z+=0.1;//每次绕着z轴旋转0.1个角度
            self.fallconfig.angle+=0.1;
            self.jumper.position.x-=0.105;
        }
        else if(self.fallconfig.FallingWay=='CubeRightEdge'&&self.fallconfig.angle<Math.PI/2)
        {
            self.jumper.rotation.z-=0.1;//绕着z轴反向转
            self.fallconfig.angle+=0.1;
            self.jumper.position.x+=0.105;
        }
        else if(self.fallconfig.FallingWay=='CubeForwardEdge'&&self.fallconfig.angle<Math.PI/2)
        {
            self.jumper.rotation.x-=0.1;//绕着x轴反向转
            self.fallconfig.angle+=0.1;
            self.jumper.position.z-=0.105;
        }
        else if(self.fallconfig.FallingWay=='CubeBackEdge'&&self.fallconfig.angle<Math.PI/2)
        {
            self.jumper.rotation.x+=0.1;//绕着x轴正向转
            self.fallconfig.angle+=0.1;
            self.jumper.position.z+=0.105;
        }
        else if(self.fallconfig.FallingWay=='empty'&&self.fallconfig.angle<Math.PI/2)
        {
            self.fallconfig.angle=Math.PI/2;
        }
        if(!self.fallconfig.end)
        {
            if(self.fallconfig.angle<Math.PI/2)
            {
                self.fallconfig.angle=self.fallconfig.angle;
            }
            else if(self.fallconfig.FallingWay!='empty'&&self.jumper.position.y>self.config.ground+self.config.jumperlong/2)
            {
                self.jumper.position.y-=0.2;//往下掉
            }
            else if(self.fallconfig.FallingWay=='empty'&&self.jumper.position.y>self.config.ground+self.config.jumperheight/2)
            {
                self.jumper.position.y-=0.2;
            }
            else
            {
                self.fallconfig.end=true;
            }
            self._render();
            requestAnimationFrame(function(){self._falling()});
        }
        else
        {
            if(self.failedCallBack)
                {
                    self.failedCallBack();
                }//游戏失败，调用游戏失败函数
        }
    },
    _checkincube:function()
    {
        var self=this;
        self.fallconfig.angle=0;
        var pointC={
            x:self.cubes[self.cubes.length-1-1].position.x,
            z:self.cubes[self.cubes.length-1-1].position.z,
        }//当前方块的坐标
        var pointN={
            x:self.cubes[self.cubes.length-1].position.x,
            z:self.cubes[self.cubes.length-1].position.z,
        }//下一个方块的坐标
        var pointJ={
            x:self.jumper.position.x,
            z:self.jumper.position.z,
        }//弹跳块所在的坐标位置
        var distanceCX=Math.abs(pointC.x-pointJ.x);//当前方块与弹跳者在x轴上相距的距离
        var distanceCZ=Math.abs(pointC.z-pointJ.z);//当前方块与弹跳者在z轴上相距的距离
        var distanceNX=Math.abs(pointN.x-pointJ.x);//下一个方块与弹跳者在x轴上相距的距离
        var distanceNZ=Math.abs(pointN.z-pointJ.z);//下一个方块与弹跳着在z轴上相距的距离
        if(self.fallconfig.dir=='left')
        {
            if(distanceCX<self.config.cubewidth/2)//弹跳者落在方块内且可以站稳当
            {
                self.config.state='current';
            }
            else if(distanceCX<self.config.cubewidth/2+self.config.jumperwidth/2)//弹跳者落在当前方块的边缘且要往下掉落
            {
               self.fallconfig.FallingWay='CubeLeftEdge'//执行在当前方块左边缘向下掉的动画
                self.config.state='ground';
                self.fallconfig.distance=distanceCX;
            }
            else if(distanceNX<self.config.cubewidth/2)//弹跳者落在下一个方块之内可以站稳
            {
                self.config.state='next';
            }
            else if(distanceNX<self.config.cubewidth/2+self.config.jumperwidth/2)//弹跳者落在下一个方块的边缘不稳
            {
                if(pointJ.x>pointN.x)
                {
                    self.fallconfig.FallingWay='CubeRightEdge';
                    //self._falling();//在下一个方块右边缘掉落
                    self.config.state='ground';
                    self.fallconfig.distance=distanceNX;
                }
                else
                {
                    self.fallconfig.FallingWay='CubeLeftEdge';
                    //self._falling();//在下一个方块左边缘掉落
                    self.config.state='ground';
                    self.fallconfig.distance=distanceNX;
                }
            }
            else
            {
                self.fallconfig.FallingWay='empty';
                //self._falling();//垂直落在地面上
                self.config.state='ground';
            }
        }
        else
        {
            if(distanceCZ<self.config.cubewidth/2)//弹跳者落在方块内且可以站稳当
            {
                self.config.state='current';
            }
            else if(distanceCZ<self.config.cubewidth/2+self.config.jumperwidth/2)//弹跳者落在当前方块的边缘且要往下掉落
            {
                self.fallconfig.FallingWay='CubeForwardEdge';
                //self._falling();//执行在当前方块前边缘向下掉的动画
                self.config.state='ground';
            }
            else if(distanceNZ<self.config.cubewidth/2)//弹跳者落在下一个方块之内可以站稳
            {
                self.config.state='next';
            }
            else if(distanceNZ<self.config.cubewidth/2+self.config.jumperwidth/2)//弹跳者落在下一个方块的边缘不稳
            {
                if(pointJ.z>pointN.z)
                {
                    self.fallconfig.FallingWay='CubeBackEdge';
                    //self._falling();//在下一个方块后面边缘掉落
                    self.config.state='ground';
                }
                else
                {
                    self.fallconfig.FallingWay='CubeForwardEdge';
                    //self._falling();//在下一个方块前面边缘掉落
                    self.config.state='ground';
                }
            }
            else
            {
                self.fallconfig.FallingWay='empty';
                //self._falling();//垂直落在地面上
                self.config.state='ground';
            }
        }
        // console.log(self.fallconfig.FallingWay+'bbbbbbbbb');
    },
    _updateCameraPos:function()
    {
        var last=this.cubes.length-1;
        var pointA={
            x:this.cubes[last].position.x,
            z:this.cubes[last].position.z,
        }
        var pointB={
            x:this.cubes[last-1].position.x,
            z:this.cubes[last-1].position.z,
        }
        var pointR=new THREE.Vector3();
        pointR.x=(pointA.x+pointB.x)/2;
        pointR.y=0;
        pointR.z=(pointA.z+pointB.z)/2;
        this.camerapos.next=pointR;
    },
    _updateCamera:function()
    {
        var self=this;
        var c={
            x:self.camerapos.current.x,
            y:self.camerapos.current.y,
            z:self.camerapos.current.z,
        }
        var n={
            x:self.camerapos.next.x,
            y:self.camerapos.next.y,
            z:self.camerapos.next.z,
        }
        if(c.x>n.x||c.z>n.z)
        {
            if(c.x>n.x)
            {
                self.camerapos.current.x-=0.17;
                if(self.camerapos.current.x-self.camerapos.next.x<0.05)
                {
                    self.camerapos.current.x=self.camerapos.next.x;
                }   
            }
            else if(c.z>n.z)
            {
                self.camerapos.current.z-=0.17;
                if(self.camerapos.current.z-self.camerapos.next.z<0.05)
                {
                    self.camerapos.current.z=self.camerapos.next.z;
                }
            }
            self.camera.lookAt(new THREE.Vector3(c.x,0,c.z));
            self._render();
            requestAnimationFrame(function(){self._updateCamera()});
        }
    },
    _initcamera:function()
    {
        this.camera.position.set(100,100,100)
        this.camera.lookAt(this.camerapos.current);
    },
    _initrender:function()
    {
        this.renderer.setSize(this.size.width,this.size.height);
        this.renderer.setClearColor(this.config.background);
        document.body.appendChild(this.renderer.domElement);
    },
    _initLight:function()
    {
        var directionalLight=new THREE.DirectionalLight();
        directionalLight.position.set(3,10,5);
        this.scene.add(directionalLight);
        var light=new THREE.AmbientLight(0xffffff,0.3);
        this.scene.add(light);
    },
    _createjumper:function()
    {
        var material=new THREE.MeshLambertMaterial({color:0x232323});
        var geometry=new THREE.BoxGeometry(this.config.jumperwidth,this.config.jumperheight,this.config.jumperlong);
        var mesh=new THREE.Mesh(geometry,material);
        mesh.position.x=0;
        mesh.position.y=2;
        mesh.position.z=0;
        this.jumper=mesh;
        this.scene.add(this.jumper);
    },
    _createcube:function()
    {
        //bonus机制：10%的概率产生特殊颜色的方块，落在上面加5分
        var randomNum = Math.random();
        var cubeColor = randomNum>0.9?'pink':0xbebebe;
        this.config.cubeColor = cubeColor //将创建的颜色存入配置中

        var material=new THREE.MeshLambertMaterial({color:cubeColor});
        var geometry=new THREE.BoxGeometry(this.config.cubewidth,this.config.cubeheight,this.config.cubelong);
        var mesh=new THREE.Mesh(geometry,material);
        // var fakeMesh=new THREE.Mesh(geometry,material);创建假台子的材质
        if(this.cubes.length)
        {
            var random=Math.random();
            this.fallconfig.dir=random>0.5?'left':'right';
            // console.log(this.fallconfig.dir,'gamedir');
            mesh.position.x=this.cubes[this.cubes.length-1].position.x;
            mesh.position.y=this.cubes[this.cubes.length-1].position.y;
            mesh.position.z=this.cubes[this.cubes.length-1].position.z;
            if(this.fallconfig.dir=='left')
            {
                mesh.position.x=this.cubes[this.cubes.length-1].position.x-4*Math.random()-6;
            }
            else
            {
                mesh.position.z=this.cubes[this.cubes.length-1].position.z-4*Math.random()-6;
            }
        }
        this.cubes.push(mesh);
        this.tableNum.push(mesh); //此处记录台子的数量
        //记录下一个台子的坐标
        if(this.fallconfig.dir == 'left'){
            this.fallconfig.posNext= this.cubes[this.cubes.length-1].position.x;
        }else{
            this.fallconfig.posNext= this.cubes[this.cubes.length-1].position.z;
        }
        if(this.cubes.length>6)
        {
            this.scene.remove(this.cubes.shift());
        }
        this.scene.add(mesh);
        // this.scene.add(fakeMesh);添加假的台子
        //每新增一个方块就重新计算摄像机坐标
        if(this.cubes.length>1)
        {
            this._updateCameraPos();
        }
    },
    _createFakecube:function()
    {
        // 创建假台子
        var material=new THREE.MeshLambertMaterial({color:0xbebebe});
        var geometry=new THREE.BoxGeometry(this.config.cubewidth,this.config.cubeheight,this.config.cubelong);
        var fakeMesh=new THREE.Mesh(geometry,material);//创建假台子的材质
        var axesHelper = new THREE.AxesHelper( 150 ); //显示坐标轴
        if(this.cubes.length)
        {
            fakeMesh.position.x=this.cubes[this.cubes.length-1].position.x;
            fakeMesh.position.y=this.cubes[this.cubes.length-1].position.y;
            fakeMesh.position.z=this.cubes[this.cubes.length-1].position.z;
            if(this.fallconfig.dir=='left')
            {
                fakeMesh.position.z=this.cubes[this.cubes.length-1].position.z
                +(this.cubes[this.cubes.length-1].position.x-this.cubes[this.cubes.length-2].position.x);
                fakeMesh.position.x=this.cubes[this.cubes.length-2].position.x;

            }
            else
            {
                fakeMesh.position.x=this.cubes[this.cubes.length-1].position.x
                +(this.cubes[this.cubes.length-1].position.z-this.cubes[this.cubes.length-2].position.z);
                fakeMesh.position.z=this.cubes[this.cubes.length-2].position.z;
            }
        }
        this.fakeCubes.push(fakeMesh);
        if(this.fakeCubes.length>1)
        {
            this.scene.remove(this.fakeCubes.shift());
        }
        this.scene.add(fakeMesh);//添加假的台子
        this.scene.add(axesHelper); //添加坐标轴

    },
    _render:function()
    {
        this.renderer.render(this.scene,this.camera);
    },
   _setsize:function()
   {
        this.size.width=window.innerWidth;
        this.size.height=window.innerHeight;
   }
}