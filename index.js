// HAMBURGER MENU
var isActive = false;

$('.js-menu').on('click', function() {
	if (isActive) {
		$(this).removeClass('active');
		$('body').removeClass('menu-open');
	} else {
		$(this).addClass('active');
		$('body').addClass('menu-open');
	}

	isActive = !isActive;
});

//SUNRISE BACKGROUND
(function(){
  "use strict" ;
 /****************************************************************************
    Helpers
 ****************************************************************************/
  function getRandomFloat( min, max ) {
    return Math.random() * ( max - min ) + min;
  }
  
  function getRandomInt( min, max ) {
    return Math.floor( getRandomFloat( min, max ) ) ;
  }
  
  function clamp( val, min, max ){
    return Math.max( min, Math.min( max, val ) ) ;
  }
  
  
/****************************************************************************
    Sunrise primary class
 ****************************************************************************/
  var Sunrise = function( stage ){
    this.init( stage ); 
  } ;

  _.extend( Sunrise.prototype, {
    sun     : undefined ,
    stage   : undefined , 
    horizon : undefined ,
    primary : 0 ,
    
    boundAnimationHandler : undefined, 
    
    bank : [],
    
    init : function( stage ){
      this.stage = stage ;
      window.onresize  = _.debounce( _.bind( this.resize, this), 100 ) ;
      this.resize() ;
      this.initHorizon() ;
      this.renderClouds() ;

      createjs.Ticker.setFPS( 40 );
      this.boundAnimationHandler  = _.bind( this.sunriseAnimation , this ) ;
      createjs.Ticker.addEventListener( "tick", this.boundAnimationHandler ) ;
    },
    
    setPrimary : function( center  ){
      var distance, current , primary , p = center ;
      for( var i = 0 ; i < this.bank.length; i++){
        current = this.bank[i] ;
        distance = Math.abs( current.displayObject.x - center ) ;
        if( distance < p){
          p = distance ;
          this.primary = current.refraction;
          primary = current ;
        }
      }
    },
    
    resize :function(){
      this.stage.canvas.width = window.innerWidth ;
      if( undefined !== this.horizon ){
        this.horizon.graphics.beginFill( "rgba(0,0,0,255)" ).drawRect( 0 , 0 , this.stage.canvas.width, 70 ) ;
      }
      if( undefined !== this.sun ){
        this.sun.x = ( this.stage.canvas.width / 2 ) ; 
      }
      if( undefined !== this.skybox ){
        this.skybox.graphics.drawRect( 0, 0,  this.stage.canvas.width, 300 ) ;
      }
    },
    
    sunriseAnimation : function( ){
      var center = this.stage.canvas.width / 2 ;
      this.setPrimary( center ) ;
      for( var i = 0 ; i < this.bank.length; i++ ){
        this.bank[i].updateDuringSunrise( this.primary, center ); 
      }
      var halo = this.sun.getChildByName( 'halo' ) ;
      
      if( halo.y > 160 ){
        halo.y -= 0.75 ;
      } else {
        if( this.sun.y > 130 ){
          halo.y -= 1 ;
          this.sun.y -= 0.75 ;
          if( this.skybox.alpha < .9 ){
            this.skybox.alpha += .01 ;
          } 
        } else {
          createjs.Ticker.removeEventListener( "tick", this.boundAnimationHandler );
          createjs.Ticker.addEventListener( "tick", _.bind( this.tick , this ) ) ;
        }
      }
      
      this.stage.update() ;
    },
    
    tick : function(){
      var center = this.stage.canvas.width / 2 ;
      this.setPrimary( center ) ;
      for( var i = 0 ; i < this.bank.length; i++ ){
        this.bank[i].update( this.primary, center ); 
      }
      this.stage.update() ;
    }, 
    
    renderClouds : function( ){
      var cloud ;
      for( var i = 0; i < 20; i++ ){
         cloud = CloudFactory.getCloud( this );
        this.bank.push( cloud ) ;
        this.stage.addChild( cloud.displayObject );
      }
    },
    
    initHorizon : function( ){
      this.renderSky() ;
      this.horizon = new createjs.Shape() ;
      this.horizon.y = 130;
      this.horizon.graphics.beginFill( "rgba(0,0,0,255)" ).drawRect( 0 , 0 , this.stage.canvas.width, 70 ) ;
      this.stage.addChild( this.horizon );
    },
    
    renderSky : function( ){
      this.skybox = new createjs.Shape() ;
      this.skybox.alpha = 0 ;
      this.skybox.graphics.beginLinearGradientFill( [ "rgba(17,17,17,255)", 
                                                 "rgba(14,19,53, 255)", 
                                                 "rgba(122,183,222, 255)", 
                                                 "rgba(229,221,165,255)"], 
                                             [ 0.01, 0.08, 0.8, 1 ], 
                                             0, 0, 0, 300 ) ;
      this.skybox.graphics.drawRect( 0, 0,  this.stage.canvas.width, 300 ) ;
      var ball = new createjs.Shape() ;
      ball.graphics.beginFill( "#fefdcc" ).drawCircle( 0, 0, 50, 50 );
      
      var halo = new createjs.Shape() ;
      halo.graphics.beginRadialGradientFill( [ "rgba(252,254,170, 255)", "rgba(252,254,170, 0)"], 
                                             [ 0.1, 1 ], 
                                             0, 0, 0, 0, 0, 200);
      halo.graphics.drawCircle( 0, 0, 200, 200 ) ;
      halo.alpha = 0.6 ;
      halo.y = 200 ;
      halo.name = "halo" ;

      
      this.sun = new createjs.Container() ;
      
      this.sun.addChild( halo ) ;
      this.sun.addChild( ball ) ;
      this.sun.y = 180;
      this.sun.x = ( this.stage.canvas.width / 2 ) ; 
      this.stage.addChild( this.skybox );
      this.stage.addChild( this.sun );
    }
    
  });
  
 /****************************************************************************
   Cloud
 ****************************************************************************/
  var Cloud = function(){ this.init( ) ; };
  _.extend( Cloud.prototype, {
    parent : undefined,
    
    sunrise    : false ,
    width      : 0 ,
    height     : 0 ,
    refraction : 0 ,
    strata     : 0 ,
    wind       : 0 ,
    
    displayObject: undefined, 

    init: function(){
      this.displayObject = new createjs.Container() ;
    },
 
    addLayer : function( layer ){
      this.displayObject.addChild( layer ) ;
    },
    
    update : function( index , center ){
       this.setLightInfluence( index , center );
      
       this.displayObject.x = this.displayObject.x + this.wind ;
       if ( this.displayObject.x > this.getStage().canvas.width ) { 
         this.displayObject.x = this.width * -1  ;
       }
    },
    updateDuringSunrise : function( index , center ){
       this.setLightInfulenceSunrise( index , center );
      
       this.displayObject.x = this.displayObject.x + this.wind ;
       if ( this.displayObject.x > this.getStage().canvas.width ) { 
         this.displayObject.x = this.width * -1  ;
       }
    },
    
    setLightInfluence : function( index , center ){
      var proximity = Math.abs( ( this.displayObject.x + ( this.width / 2 ) ) - center ) / center  ;
      this.displayObject.alpha = 1 - proximity ;
      var kids = this.displayObject.children ;
      for( var i = 1; i < kids.length - 1 ; i++ ){
        if( i === index + 1 ){
          kids[i].alpha = clamp( 1 - proximity, kids[i].alpha - 0.01, kids[i].alpha + 0.01 )  ;
        } else {
          kids[i].alpha = clamp( proximity, kids[i].alpha - 0.01, kids[i].alpha + 0.01 )  ;
        }
      }
    } ,
    
    setLightInfulenceSunrise : function( index, center ){
      var proximity = Math.abs( ( this.displayObject.x + ( this.width / 2 ) ) - center ) / center  ;
      this.displayObject.alpha = 1 - proximity ;
      var kids = this.displayObject.children ;
      if( kids[ kids.length - 1 ].alpha > 0 ){
          kids[ kids.length - 1 ].alpha -= 0.008;
      } 
      for( var i = 0; i < kids.length - 1 ; i++ ){
        if( 0 === i ){ 
          kids[ 0 ].alpha += 0.005 ;
        } else if( i === index + 1 ){ 
          kids[i].alpha = clamp( 1 - proximity, kids[i].alpha - 0.01, kids[i].alpha + 0.01 )  ;
        } else {
          kids[i].alpha = clamp( proximity, kids[i].alpha - 0.01, kids[i].alpha + 0.01 )  ;
        }
      }
    }, 
    
    getStage : function( ){
       return this.displayObject.parent ;
    },
  });
  

  var CloudFactory = {
    CANVAS_HEIGHT    : 300 ,
    HORIZON_Y        : 130 ,
    STRATA_OFFSET    : 40 ,
    STRATA_VARIATION : 16 ,
    
    getCloud : function( parent ) {
      // Select a random cloud data path
      var paths = this.getPath() ;
      
      // Initialize a base cloud
      // init code moved to the factory so I can concentrate on behavior in the cloud itself.
      var cloud = this.initCloudProperties( new Cloud(), paths, parent ) ;
      
      // Create a white backing layer for bright-white effects
      var backing = this.createShape( "rgba(255,255,255,255)", paths.base ) ;
      backing.name = "light" ;
      backing.alpha = 0 ;
      cloud.addLayer( backing ) ;
      
      // A Cloud needs one color-layer for each potential refraction color
      var layer ;
      for( var i = 0; i <  this.colors.length; i++ ){
        layer = this.createLayer( this.colors[i], paths); 
        layer.alpha = 0 ;
        layer.name = "layer_" . i ;
        cloud.addLayer( layer ) ; 
      }

      // Finally, create a dark overlay to allow us to produce knockout effects in the sunrise appearance
      var overlay = this.createShape( "rgba(0,0,0,255)", paths.base , 2, "#000000") ;
      overlay.name = "dark" ;
      cloud.addLayer( overlay ) ;
      
      //debug only -- delete when building introduction animation
      overlay.alpha = 1 ;
      
      return cloud ;
    },
    
    initCloudProperties : function( cloud , paths, parent ){
      cloud.sky = parent ;
      cloud.refraction = this.getRefraction();
      cloud.strata = this.getStrata();
      cloud.wind = this.getWindSpeed() ;
      
      var scale = getRandomFloat( 0.4 , 1.1 ) ;
      cloud.displayObject.scaleX = cloud.displayObject.scaleY = scale ;
      
      cloud.width = paths.width * scale ;
      cloud.height = paths.height * scale ;
      
      cloud.displayObject.x = getRandomInt( 0, cloud.sky.stage.canvas.width );
      
      var y = ( this.HORIZON_Y - ( this.STRATA_OFFSET * cloud.strata )  - this.STRATA_VARIATION );
      cloud.displayObject.y = getRandomInt( y , y + ( this.STRATA_VARIATION * cloud.strata )  );
      
      return cloud ;
    },
    
    getPath : function( ){
      return this.shapes[ getRandomInt( 0, this.shapes.length ) ];
    },
    
    createLayer : function( colors , shapes ){
      var layer = new createjs.Container() ;
      layer.addChild( this.createShape( colors.base, shapes.base ) ) ;  
      layer.addChild( this.createShape( colors.highlight, shapes.highlight ) );
      layer.addChild( this.createShape( colors.shadow, shapes.shadow ) ) ;
      return layer ;
    },
      
    
    createShape : function( color, ins , strokeWidth, strokeColor){
      var shape = new createjs.Shape() ;
      shape.x = shape.y = 0 ;
      if( strokeWidth && strokeColor ){
        shape.graphics.ss(strokeWidth).beginStroke(strokeColor);
      }
      
      shape.graphics.f( color ).p( ins ).cp().ef();
      return shape ;
    }, 

    /// Simulation Parameters
    
    getRefraction : function( ){
      ///TODO: rebuild this so that refraction indexes are weighted
      /// Pure random may generate a lot of color thrashing
      return getRandomInt( 0, this.colors.length ) ;
    },
    
    getStrata : function( ){
      return getRandomInt( 1, 4 );
    },
    
    getWindSpeed : function( ){
      return getRandomFloat( 0.2 , 1.0 ) ;
    },
    
    
    colors : [
     {
       base : "rgba(244,254,19,254)",
       highlight : "rgba(252,254,170,255)",
       shadow : "rgba(255,168,24 ,254)"
     },
     {
       base : "rgba(255,212,129,254)",
       highlight : "rgba(251,248,212,255)",
       shadow : "rgba(207,90,32 ,254)"
     },
     {
       base : "rgba(254,13,90,254)",
       highlight : "rgba(253,114,94,254)",
       shadow : "rgba(125,42,96,254)"
     },
     {
       base : "rgba(253,173,103,255)",
       highlight : "rgba(254,246,111,254)",
       shadow : "rgba(250,51,71,255)"
     }
    ],
    
    shapes: [
    {
      width: 106,
      height: 42,
      base : "AAKEsYgTAAAnAKAKAAYAAgKAeAUAAAAYAAAAAKAAAAAKYAAAAAUAKAeAAYAeAAgUAUAeAKYAUAeAegeAAAAYAAAAAegKAUAUYAeAUAUgKAUAAYAUAAAUAUAoAAYAeAAAKgUAUAAYAKAAAAAKAeAAYAUAAAKgKAAAAYAAAAAeAUAeAAYAUAAAUgKAKAAYAUAAAKAKAeAAYAeAAAUgKAKgKYAKAAAKAKAeAAYAUAAAKgKAKgKYAAAAgKgKAKAAYAKgKAogKAKAAYAUAAAAAUAUAAYAeAAAUgKAKAAYAKAAAKgUAAgKYAAgKgUgUgeAKYgUgUgogKgUAKYgogegyAKgUAKYgKgohGAKgUAAYgUgKAKgygyAKYgohahGAegUAAYgUgUgoAAAAAAYAAAAAUgogoAAYAAgogUgUgKAAYgUAAgUgUgeAUYgegKgKAUgUAAYgUAAgegUgUAoYgegKgKAUAAAAYAAAAgygKgKAUYAAAUAAgUAKAKYgeAUAKAKgKAKYgKAKAeAAgKAKYgKAKgUAAAAAUYAAAeAAgUAKAKYgoAUAKAUAAAAYAAAAgoAUAUAeYAKAKgUAAAAAAYAAAAgKAAAAAK", 
      highlight : "AAKEsYgTAAAnAKAKAAYAAgKAeAUAAAAYAAAAAKAAAAAKYAAAAAUAKAeAAYAeAAgUAUAeAKYAUAeAegeAAAAYAAAAAegKAUAUYAeAUAUgKAUAAYAUAAAUAUAoAAYAeAAAKgUAUAAYAKAAAAAKAeAAYAUAAAKgKAAAAYAAAAAeAUAeAAYAUAAAUgKAKAAYAUAAAKAKAeAAYAeAAAUgKAKgKYAKAAAKAKAeAAYAUAAAKgKAKgKYAAAAgKgKAKAAYAKgKAogKAKAAYAUAAAAAUAUAAYAeAAAUgKAKAAYAKAAAKgUAAgKYAAgKgeAegUAAYgUgKgegUgKAKYgogeAABGgegeYg8AoAAg8goAKYgoAKgyAehQgKYgeAAAAgUgoAKYgoAKAUgyg8AAYhaAAgKAKgyAUYgyAUgKgygyAeYgoAUAAg8geAKYgoAAgogKAAAAYAAAAgegKAAAK",
      shadow : "ABuCgYAAgUAAgUAogUYAAAAAeAyAKgKYgUgKgKgUAKgKYAegeAygKAKAKYgyAKgUAeAoAAYAeAKAegUAAgoYAUAUgKAoAAAAYgKAAAUgUAeAAYAUAAAAAKAKAKYAUAKgKg8gegUYAogKAKAKAUAKYAKAKAoBGgyAeYAUAKAKgUAeAAYAUAKAUAAAeAAYAUAKBGAegegKYgegKgeAKAAAAYAAAAAoAKAUAAYAeAAAKAAAKAAYAUAKAAAKAAAAYgegUgoAKAAAAYAAAAAoAKAoAUYAeAUAogKAAAAYAAAAgKAKgoAAYgoAAhkgUgKAAYgUAAgygeAAAAYAAAAgUAAAKAeYgKgKgKgKAAgKYgegKAKAUgKAAYgKAAgUgKAAgKYAAgKAAgUgegKYgegKgyAKgKAKYAAAAAAAKgKAUYgKgKAUgegoAAYgKgKgUAKAAAyYgKAAAKgogygKYAAAAAKgUAoAKYgogegUAegKAAYAAAAgUAAAAAeYgKAAAAgKAAgU"
    },
    {
      width: 106,
      height: 42,
      base : "AQQEsYAeAAgyAKgKAAYAAgKgeAUAAAAYAAAAgKAAAAAKYAAAAgUAKgeAAYgeAAAUAUgeAKYgUAegegeAAAAYAAAAgegKgUAUYgeAUgUgKgUAAYgUAAgUAUgoAAYgeAAgKgUgUAAYgKAAAAAKgeAAYgUAAgKgKAAAAYAAAAgeAUgeAAYgUAAgUgKgKAAYgUAAgKAKgeAAYgeAAgUgKgKgKYgKAAgKAKgeAAYgUAAgKgKgKgKYAAAAAKgKgKAAYgKgKgogKgKAAYgUAAAAAUgUAAYgeAAgUgKgKAAYgKAAgKgUAAgKYAAgKAUgUAeAKYAUgUAogKAUAKYAogeAyAKAUAKYAKgoBGAKAUAAYAUgKgKgyAyAKYAohaBGAeAUAAYAUgUAoAAAAAAYAAAAgUgoAoAAYAAgoAUgUAKAAYAUAAAUgUAeAUYAegKAKAUAUAAYAUAAAegUAUAoYAegKAKAUAAAAYAAAAAygKAKAUYAAAUAAgUgKAKYAeAUgUAKAUAKYAKAKgeAAAKAKYAKAKAUAAAAAUYAAAeAAgUgKAKYAoAUgKAUAAAAYAAAAAoAUgUAeYgKAKAUAAAAAAYAAAAAKAAAAAK", 
      highlight : "AQQEsYAeAAgyAKgKAAYAAgKgeAUAAAAYAAAAgKAAAAAKYAAAAgUAKgeAAYgeAAAUAUgeAKYgUAegegeAAAAYAAAAgegKgUAUYgeAUgUgKgUAAYgUAAgUAUgoAAYgeAAgKgUgUAAYgKAAAAAKgeAAYgUAAgKgKAAAAYAAAAgeAUgeAAYgUAAgUgKgKAAYgUAAgKAKgeAAYgeAAgUgKgKgKYgKAAgKAKgeAAYgUAAgKgKgKgKYAAAAAKgKgKAAYgKgKgogKgKAAYgUAAAAAUgUAAYgeAAgUgKgKAAYgKAAgKgUAAgKYAAgKAeAeAUAAYAUgKAegUAKAKYAogeAABGAegeYA8AoAAg8AoAKYAoAKAyAeBGgKYAoAAAAgUAoAKYAoAKgUgyA8AAYBaAAAKAKAyAUYAyAUAKgyAyAeYAoAUAAg8AeAKYAoAAAogKAAAAYAAAAAegKAAAK",
      shadow : "AOsCgYAAgUAAgUgogUYgKAAgUAygKgKYAUgKAKgUgKgKYgegegygKgKAKYAyAKAUAegoAAYgeAKgegUAAgoYgUAUAKAoAAAAYAKAAgUgUgeAAYgUAAAAAKgKAKYgUAKAKg8AegUYgogKgKAKgUAKYgKAKgoBGAyAeYgUAKgKgUgeAAYgUAKgeAAgUAAYgUAKhGAeAegKYAegKAeAKAAAAYAAAAgoAKgUAAYgeAAgKAAgKAAYgUAKAAAKAAAAYAegUAoAKAAAAYAAAAgoAKgoAUYgeAUgogKAAAAYAAAAAKAKAoAAYAoAABkgUAKAAYAUAAAygeAAAAYAAAAAUAAgKAeYAKgKAKgKAAgKYAegKgKAUAKAAYAKAAAUgKAAgKYAAgKAAgUAegKYAegKAyAKAAAKYAKAAAAAKAKAUYAKgKgUgeAoAAYAKgKAUAKAAAyYAKAAgKgoAygKYAAAAgKgUgoAKYAogeAUAeAKAAYAAAAAUAAAAAeYAKAAAAgKAAgU"
    },
    {
      width: 84,
      height: 41,
      base : "ANIEEYAKAKgKAAgUAAYgUAAgKAKAAAAYAAAAgeAogKgKYgUAAgKAogeAAYgUgKgUAKgeAKYgeAKAAgoAAAAYAAAAh4Aeg8gyYgeAUgUgKgKAKYgKAKAUgKgKAKYAAAKgKAKgUAAYgKgKgUA8gUgUYgKgKg8AUgKAAYgKAAgUgKgKgeYAAAKgKgKgKAKYgUAUgKgoAAAAYAAAAgoAKAAgyYgKAAgKAAAAgUYgKAKgKgUgKgKYAAgKAAgeAKgKYAAgUAAgKAAgKYgKAAAAgKAAgKYAAAAAKAAAAgKYAAgKgKgKAAAAYAAAAgKgeAAgeYAKgUAUgUAAAAYAAAAAegUAKAKYAegUAeAKAAAAYAAAAAygnAoA7YAUgKAUAAAKAoYAUgUAKgUAeAAYBuAAAKAyAAAAYAAAAAoAUAKgKYAAgKAKgKAKAKYAUAAAAAKAAAAYAAAAAKAKgKAKYAUAAAyAeAAAAYAAAKAAAKgUgKYgKAAAeAKAUAKYAKAKAAgUAUAAYAUgKAeAUAAAAYAAAAAKAKgKAKYAUAAAKAeAAAAYAAAAAAAAgKAKYAKAKAUAAAAAKYAKAUA8gKAKAK", 
      highlight : "ANIEEYAKAKgKAAgUAAYgUAAgKAKAAAAYAAAAgeAogKgKYgUAAgKAogeAAYgUgKgUAKgeAKYgeAKAAgoAAAAYAAAAh4Aeg8gyYgeAUgUgKgKAKYgKAKAUgKgKAKYAAAKgKAKgUAAYgKgKgUA8gUgUYgKgKg8AUgKAAYgKAAgUgKgKgeYAAAKgKgKgKAKYgUAUgKgoAAAAYAAAAgoAKAAgyYgKAAgKAAAAgUYgKAKgKgUgKgKYAAgKAAgeAKgKYAAgUAAgKAAgKYgKAAAUgKAKAKYAKAKgKgoAKgKYAAgKAUAAAAAAYAAAAAegKAAgeYAUAAAAgoAAAAYAAAAAoAKAUAKYAKAUAUAoAKAAYAUAKgKAoAUAKYAKgKgKgeAKAKYAUAUAygKAAAeYAoAKgUgoAoAAYBkAAC0AUAUAUYAeAKAeAUAAAKYAAAAAAAKAUAKYAUAAAogUAKAK",
      shadow : "AAyAyIAUgUYAAAAAKgKAKAAYAUAAAUAKAAAAYAAAAAUgUAUAAYAUAAAeA8AAAAYAAAAAUgeAKAAIAeAoYAAAAAUgoAyAAYAyAAAoAyAAAAIAyAKYAAAAAUgUAKAAYAUAAgKAeAAAAYAAAAAUAUAeAAYAKAKgyAAgKgUYgUgUAAgKgUAKYgKAAhQgegygKYgyAAgUAUAAAAYAAAAgUgUgKAAYgUAAgKAKAAAAYAAAAgUgogeAAYgeAAgKAAAAAAYAAAAgUAAgKAAYgUAAgeAUAAAA"
    },
    {
      width: 84,
      height: 41,
      base : "AAAEEYAAAKAAAAAUAAYAeAAAAAKAAAAYAAAAAeAoAUgKYAKAAAUAoAUAAYAegKAUAKAUAKYAeAKAAgoAAAAYAAAAB4AeA8gyYAeAUAegKAKAKYAAAKgKgKAAAKYAAAKAUAKAKAAYAKgKAUA8AUgUYAUgKAyAUAKAAYAKAAAUgKAUgeYAAAKAAgKAKAKYAeAUAAgoAAAAYAAAAAyAKgKgyYAKAAAKAAAKgUYAKAKAAgUAKgKYAKgKgKgeAAgKYgKgUAAgKAKgKYAAAAAAgKAAgKYAAAAgKAAAAgKYAAgKAUgKAAAAYAAAAAKgegKgeYAAgUgegUAAAAYAAAAgUgUgKAKYgegUgoAKAAAAYAAAAgogngyA7YgUgKgUAAgKAoYgUgUgKgUgeAAYhkAAgUAyAAAAYAAAAgeAUgUgKYAAgKAAgKgUAKYgUAAAAAKAAAAYAAAAgKAKAUAKYgeAAgoAegKAAYAAAKAKAKAKgKYAKAAgeAKgKAKYgUAKAAgUgUAAYgUgKgUAUAAAAYAAAAgKAKAAAKYgUAAAAAeAAAAYAAAAgKAAAKAKYgKAKgKAAgKAKYgKAUg8gKgKAK", 
      highlight : "AAAEEYAAAKAAAAAUAAYAeAAAAAKAAAAYAAAAAeAoAUgKYAKAAAUAoAUAAYAegKAUAKAUAKYAeAKAAgoAAAAYAAAAB4AeA8gyYAeAUAegKAKAKYAAAKgKgKAAAKYAAAKAUAKAKAAYAKgKAUA8AUgUYAUgKAyAUAKAAYAKAAAUgKAUgeYAAAKAAgKAKAKYAeAUAAgoAAAAYAAAAAyAKgKgyYAKAAAKAAAKgUYAKAKAAgUAKgKYAKgKgKgeAAgKYgKgUAAgKAKgKYAAAAgUgKgKAKYgKAKAKgogKgKYAAgKgUAAAAAAYAAAAgUgKAAgeYgeAAAAgoAAAAYAAAAgeAKgUAKYgUAUgUAogKAAYgUAKAKAogKAKYgUgKAKgeAAAKYgeAUgogKgKAeYgoAKAUgogeAAYhuAAiqAUgeAUYgeAKgUAUgKAKYAAAAAAAKgUAKYgUAAgogUgKAK",
      shadow : "AMWAyIgUgUYAAAAgKgKgKAAYgUAAgUAKAAAAYAAAAgUgUgUAAYgKAAgoA8AAAAIgUgeYgKAAgeAoAAAAYAAAAgUgogyAAYgyAAgoAyAAAAIgyAKYAAAAgKgUgKAAYgeAAAUAeAAAAYAAAAgUAUgoAAYAAAKAoAAAUgUYAKgUAAgKAUAKYAUAABGgeAygKYAyAAAUAUAAAAYAAAAAUgUAUAAYAKAAAKAKAAAAYAAAAAegoAUAAYAeAAAKAAAAAAYAAAAAUAAAUAAYAUAAAUAUAAAA"
    },
    {
      width: 100,
      height: 35,
      base : "AAACqYAAgKAogKAKAKYgKgeAUgKAKAAYAKgeAeAAAUAUYgUg8BQAKAKAAYAUgUAoAKAAAAYAAAAAKgKAoAKYAyhFBaAdAKAoYAyg7BQAnAKAUYA8gyBQAeAUAeYA8gUAUAoAKAAYA8AAgUAoAAAKYA8gKgKAyAAAAYAUgKAKAKAAAAYAAAAAKAKgKAKYAUAAAKAKAAAKYAAAKgoAogeAAYgKAygoAKgygUYhkA8h4gegKAKYgyAUg8gegKAKYhaAeg8gegKgKYg8AUgeg8gKAKYgyAKgKgegKgUYgUAUgogyAAAAYAAAAgyAKgKgeYgegKAAgUAAgK", 
      highlight : "AAACqYAAgKAeAUAKAKYAKAyBkgoAKAAYAAA8AeAAAKAKYAygeA8AoAAAAYAeAyAygeAAAAYAAAABagUAeAKYAKBQBkhQAyAUYBGAUA8hGAKAKYAygygKAoAKAeYA8gKAKgyAAAKYAKAKA8gyAAAKYAAAKgoAogeAAYgKAygoAKgygUYhkA8h4gegKAKYgyAUg8gegKAKYhaAeg8gegKgKYg8AUgeg8gKAKYgyAKgKgegKgUYgUAUgogyAAAAYAAAAgyAKgKgeYgegKAAgUAAgK",
      shadow : "ABkB4YAAAAAUAKAKgKYAKAAAKgoAAAKYAAAKAAgUAKAAYAKAAAyAAAAAAYAAgKAKAAAKAAYgoAegKAAgKAAYgUAKAeAAAAAAYAAAAAegKAKAAYAUAAAKAAAKAAYAKgKAKgKAKAAYAKgKAKgKAKgKYAKAAAKgUAUAAYAKAAAeAKAAAAYAAAAAeAeAUAAYAKAAAKgeAUAAYAUAAAyAAAAAKYhQAKAAAKAAAKYAAAUhkgoAKAKYAAAeAUgKAUAKYAUAAAUAeA8gUYBGgKgUgUAUgKYAKgKAUgUAUAAYAUAAAKAAAUAAYAKAAAAAUAUAKYAKAAAoAAAUAAYAKAKAUAKAAAAIAeAKYAAAAg8AAgUAAYgeAAgogeAKAKYAKAAgUgKgUgKYgeAAgoAKgKAKYgKAKgUAegeAKYgoAKgygKgeAAYgegKgUgUAAAAIgUgUIgoAAYAAAAhQAogUAKYgUAAAAgKgyAUYAAAAAUgUgUgKYAAAAgeAegKAAYgKAAgKgUAAAA"
    }
  ]
};
  
/****************************************************************************
   GO! GO! GO!!!!
 ****************************************************************************/
  window.onload = function() {
    window.__sunrise = new Sunrise(new createjs.Stage("sunrise")) ;
  } ;
})();
