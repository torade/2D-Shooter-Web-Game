let game

const gameOptions = {
    dudeGravity: 980,
    dudeSpeed: 300
}

window.onload = function() {
    let gameConfig = {
        type: Phaser.AUTO,
        backgroundColor: '#FAF9F6',
        scale : {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 1000,
            height: 800
        },
        pixelArt: true,
        physics: {
            default: "arcade",
            arcade: {
                gravity: {
                    y: 0
                }
            }
        },
        scene: PlayGame
    }

    game = new Phaser.Game(gameConfig);
    window.focus(); 
}

class PlayGame extends Phaser.Scene {
    constructor() {
        super("PlayGame")
        this.score = 0
        this.snowballCount = 0 // = no. of snowballs that the player has
    }

    preload() {
        this.load.spritesheet('dude', 'assets/dude.png', {frameWidth: 32, frameHeight: 48})
        this.load.image('ground', 'assets/ground.png')
        this.load.image('snow', 'assets/snow.png')
        this.load.image('target', 'assets/target.png')
        this.load.image('bomb', 'assets/bomb.png')
    }

    create() {
        this.ground = this.physics.add.group({
            immovable: true,
            allowGravity: false
        })

        this.ground.create(500, 770, 'ground').setScale(0.2, 0.2);

        this.dude = this.physics.add.sprite(game.config.width / 2, game.config.height / 2, "dude")
        this.dude.body.gravity.y = gameOptions.dudeGravity
        this.physics.add.collider(this.dude, this.ground)

        // trajectory line helper
        this.trajectoryLine = this.add.graphics()
        
        // falling snowballs
        this.snowballsGroup = this.physics.add.group({})
        this.physics.add.overlap(this.dude, this.snowballsGroup, this.collectSnowball, null, this)

        // bombs
        this.bombsGroup = this.physics.add.group({})
        this.physics.add.overlap(this.dude, this.bombsGroup, this.hitByBomb, null, this)

        // player thrown snowballs
        this.thrownSnowballs = this.physics.add.group({})

        // targets
        this.targetsGroup = this.physics.add.group({
            immovable: true,
            allowGravity: false
        })
        
        this.maxTargets = 7
        this.createTargets()
        this.maxBombs = 15
    
        // snowball - target collision
        this.physics.add.overlap(this.thrownSnowballs, this.targetsGroup, this.hitTarget, null, this)

        // timer for spawining targets
        this.targetTimer = this.time.addEvent({
            callback: this.spawnNewTarget,
            callbackScope: this,
            delay: 2000, // Every 2 seconds
            loop: true
        })

        // timer for spawning bombs
        this.bombTimer = this.time.addEvent({
            callback: this.spawnBomb,
            callbackScope: this,
            delay: 2600,
            loop: true
        })

        // timer for spawning snowballs
        this.snowballTimer = this.time.addEvent({
            callback: this.addSnowballs,
            callbackScope: this,
            delay: 600,
            loop: true
        })

        // score visuals
        this.add.image(20,20,'target').setScale(0.07)
        this.scoreText = this.add.text(40,5,'0 XP', {fontSize: '30px', fill: '#000'})

        // player snowball counter
        this.playerBallText = this.add.text(this.dude.x, this.dude.y, '0', {
            fontSize: '20px', 
            fill: '#000',
            padding: { x: 5, y: 2 }
        }).setOrigin(0.5)

        this.cursors = this.input.keyboard.createCursorKeys()
        
        // adding WASD keys for movement instead of arrow keys
        this.wasd = this.input.keyboard.addKeys('W,S,A,D')
        
        
        // mouse controls
        this.input.on('pointerdown', this.shootSnowball, this)
        
        // dude animations
        this.anims.create({
            key: "left",
            frames: this.anims.generateFrameNumbers("dude", {start: 0, end: 3}),
            frameRate: 10,
            repeat: -1
        })
        this.anims.create({
            key: "turn",
            frames: [{key: "dude", frame: 4}],
            frameRate: 10,
        })

        this.anims.create({
            key: "right",
            frames: this.anims.generateFrameNumbers("dude", {start: 5, end: 9}),
            frameRate: 10,
            repeat: -1
        })
    }

    // spawning snowballs
    addSnowballs() {
        let snowball = this.snowballsGroup.create(Phaser.Math.Between(50, game.config.width - 50), Phaser.Math.Between(50, 500), "snow")
        snowball.setScale(0.02)
        snowball.body.setVelocity(0, 0) // no movement initially
        snowball.body.setGravityY(0) // no gravity initially
        
        // enabling gravity after 3 seconds
        this.time.delayedCall(3000, () => {
            if (snowball && snowball.active) {
                snowball.body.setGravityY(400)
            }
        })
        
        // despawn snowball 
        this.time.delayedCall(15000, () => {
            if (snowball && snowball.active) {
                snowball.destroy()
            }
        })
    }

    // snowball collection counter
    collectSnowball(dude, snowball) {
        snowball.disableBody(true, true)
        this.snowballCount += 1;
        this.playerBallText.setText(this.snowballCount);
    }

    // starting targets
    createTargets() {
        for (let i = 0; i < this.maxTargets; i++) {
            this.spawnNewTarget()
        }
    }

    // spawning targets
    spawnNewTarget() {
        if (this.targetsGroup.children.size < this.maxTargets) {
            let x = Phaser.Math.Between(100, game.config.width - 100)
            let y = Phaser.Math.Between(200, 650)
            let target = this.targetsGroup.create(x, y, 'target').setScale(0.1)
        }
    }

    // shooting mechanism
    shootSnowball(pointer) {
        if (this.snowballCount > 0) {
            // create snowball projectile
            let projectile = this.thrownSnowballs.create(this.dude.x, this.dude.y - 20, 'snow')
            projectile.setScale(0.02)
            
            // coords of pointer
            let mouseX = pointer.x
            let mouseY = pointer.y
            
            // angle from player to mouse
            let angle = Phaser.Math.Angle.Between(this.dude.x, this.dude.y, mouseX, mouseY)
            
            // determine velocity based on angle
            let speed = 500
            let velocityX = Math.cos(angle) * speed
            let velocityY = Math.sin(angle) * speed
            
            projectile.body.setVelocity(velocityX, velocityY)
            projectile.body.setGravityY(200) // Slight gravity for arc
            
            // subtract from player's snowball count
            this.snowballCount -= 1
            this.playerBallText.setText(this.snowballCount)
             
            // destroy projectile (if it doesnt hit any target)
            this.time.delayedCall(8000, () => {
                if (projectile && projectile.active) {
                    projectile.destroy()
                }
            })
        }
    }

    // target hit mechanism
    hitTarget(snowball, target) {
        // destroy projectile
        snowball.destroy()
        // add 10 points to score
        this.score += 10
        this.scoreText.setText(this.score + ' XP')
        // destroy hit targer
        target.destroy()
    }

    // trajectory line helper
    drawTrajectoryLine() {
        // constantly clear lines
        this.trajectoryLine.clear()
            // pointer coords
            let mouseX = this.input.activePointer.x
            let mouseY = this.input.activePointer.y
            
            // distance and direction
            let fullDistance = Phaser.Math.Distance.Between(this.dude.x, this.dude.y, mouseX, mouseY)
            let angle = Phaser.Math.Angle.Between(this.dude.x, this.dude.y, mouseX, mouseY)
            
            // limit line length
            let maxLength = 100
            let lineLength = Math.min(fullDistance, maxLength)
            
            // end point of line
            let endX = this.dude.x + Math.cos(angle) * lineLength
            let endY = this.dude.y + Math.sin(angle) * lineLength
            
            // style
            this.trajectoryLine.lineStyle(2, "#808080", 0.2)
            let segments = Math.floor(lineLength / 10)
            let deltaX = (endX - this.dude.x) / segments
            let deltaY = (endY - this.dude.y) / segments
            
            for (let i = 0; i < segments; i += 2) { // skip every other segment for dotted line effect
                let startX = this.dude.x + (deltaX * i)
                let startY = this.dude.y + (deltaY * i)
                let segmentEndX = this.dude.x + (deltaX * (i + 1))
                let segmentEndY = this.dude.y + (deltaY * (i + 1))
                
                this.trajectoryLine.lineBetween(startX, startY, segmentEndX, segmentEndY)
            }
    }

    update() {
        // check for game over (.isPaused)
        if (!this.physics.world.isPaused) {
            //movement controls + animations
            if (this.wasd.A.isDown) {
                this.dude.body.velocity.x = -gameOptions.dudeSpeed;
                this.dude.anims.play('left', true)
            }
            else if (this.wasd.D.isDown) {
                this.dude.body.velocity.x = gameOptions.dudeSpeed;
                this.dude.anims.play('right', true)
            }
            else {
                this.dude.body.velocity.x = 0;
                this.dude.anims.play('turn', true)
            }

            if (this.wasd.W.isDown && this.dude.body.touching.down) {
                this.dude.body.velocity.y = -gameOptions.dudeGravity / 2;
            }

            // player ball count position
            this.playerBallText.x = this.dude.x;
            this.playerBallText.y = this.dude.y - 60;

            // trajectory helper
            this.drawTrajectoryLine()
        }
        
        // game over => check for restart (R)
        if (this.restartKey && Phaser.Input.Keyboard.JustDown(this.restartKey)) {
            this.scene.restart()
        }
    }
    
    spawnBomb() {
        if (this.bombsGroup.children.size < this.maxBombs) {
            let x = Phaser.Math.Between(50, game.config.width - 50)
            let y = Phaser.Math.Between(50, 300)
            
            let bomb = this.bombsGroup.create(x, y, 'bomb')
            bomb.setScale(0.05) 
            bomb.body.setVelocity(0, 0) // no movement
            bomb.body.setGravityY(0) // no gravity
            
            // shaking + falling timer
            this.time.delayedCall(5000, () => {
                if (bomb && bomb.active) {
                    this.startBombShaking(bomb)
                }
            })
        }
    }

    // bomb falling process
    startBombShaking(bomb) {
        if (!bomb || !bomb.active) return
        
        // initial position
        bomb.originalX = bomb.x
        bomb.originalY = bomb.y
        bomb.isShaking = true
        
        // actual shaking effect
        bomb.shakeTimer = this.time.addEvent({
            callback: () => {
                if (bomb && bomb.active && bomb.isShaking) {
                    // random shake (3 pixels)
                    bomb.x = bomb.originalX + Phaser.Math.Between(-3, 3)
                    bomb.y = bomb.originalY + Phaser.Math.Between(-3, 3)
                }
            },
            delay: 50, // shake every 50ms
            repeat: 20 // for 1 second (20 * 50ms = 1000ms = 1s)
        })
        
        // fall
        this.time.delayedCall(1000, () => {
            if (bomb && bomb.active) {
                bomb.isShaking = false
                // reset to original position
                bomb.x = bomb.originalX
                bomb.y = bomb.originalY
                bomb.body.setGravityY(800)
            }
        })
        
        // destroy bomb
        this.time.delayedCall(10000, () => {
            if (bomb && bomb.active) {
                bomb.destroy()
            }
        })
    }

    // player - bomb interaction
    hitByBomb(dude, bomb) {
        bomb.destroy()
        this.physics.pause()
        this.snowballTimer.destroy()
        this.targetTimer.destroy()
        this.bombTimer.destroy()
        this.wasd.A.enabled = false
        this.wasd.D.enabled = false
        this.wasd.W.enabled = false
        this.input.off('pointerdown')
        
        // game over screen
        let gameOverBg = this.add.rectangle(game.config.width / 2, game.config.height / 2, game.config.width, game.config.height, 0x000000, 0.7)
        let gameOverText = this.add.text(game.config.width / 2, game.config.height / 2 - 50, 'G A M E   O V E R', {
            fontSize: '64px',
            fill: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5)
        
        let finalScoreText = this.add.text(game.config.width / 2, game.config.height / 2 + 20, 'Score: ' + this.score, {
            fontSize: '36px',
            fill: '#ffffff'
        }).setOrigin(0.5)
        
        let restartText = this.add.text(game.config.width / 2, game.config.height / 2 + 80, 'Press R to Restart', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5)
        
        this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)
    }
}