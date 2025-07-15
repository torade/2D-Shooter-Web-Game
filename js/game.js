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
        this.snowballCount = 0 // Separate counter for snowballs
    }

    preload() {
        this.load.spritesheet('dude', 'assets/dude.png', {frameWidth: 32, frameHeight: 48})
        this.load.image('ground', 'assets/platform.png')
        this.load.image('snow', 'assets/snow.png')
        this.load.image('target', 'assets/target.png')
    }

    create() {
        this.ground = this.physics.add.group({
            immovable: true,
            allowGravity: false
        })

        let groundSprite = this.ground.create(500, 750, 'ground').setScale(10, 4);

        this.dude = this.physics.add.sprite(game.config.width / 2, game.config.height / 2, "dude")
        this.dude.body.gravity.y = gameOptions.dudeGravity
        this.physics.add.collider(this.dude, this.ground)

        // falling snowballs
        this.snowballsGroup = this.physics.add.group({})
        this.physics.add.overlap(this.dude, this.snowballsGroup, this.collectSnowball, null, this)

        // player thrown snowballs
        this.thrownSnowballs = this.physics.add.group({})

        // targets
        this.targetsGroup = this.physics.add.group({
            immovable: true,
            allowGravity: false
        })
        
        this.maxTargets = 7
        
        // Create initial targets
        this.createTargets()

        // Collision between thrown snowballs and targets
        this.physics.add.overlap(this.thrownSnowballs, this.targetsGroup, this.hitTarget, null, this)

        // Timer to spawn new targets periodically
        this.targetTimer = this.time.addEvent({
            callback: this.spawnNewTarget,
            callbackScope: this,
            delay: 2000, // Every 2 seconds
            loop: true
        })

        this.add.image(20,20,'target').setScale(0.07)
        this.scoreText = this.add.text(40,5,'0 XP', {fontSize: '30px', fill: '#000'})

        // Add snowball count text above player's head
        this.playerScoreText = this.add.text(this.dude.x, this.dude.y - 10, '0', {
            fontSize: '20px', 
            fill: '#000',
            padding: { x: 5, y: 2 }
        }).setOrigin(0.5)

        this.cursors = this.input.keyboard.createCursorKeys()
        
        // Add WASD keys
        this.wasd = this.input.keyboard.addKeys('W,S,A,D')
        
        // Add spacebar for shooting
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

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

        // timer to spawn snowballs every 1.6 seconds
        this.snowballTimer = this.time.addEvent({
            callback: this.addSnowballs,
            callbackScope: this,
            delay: 600,
            loop: true
        })

        this.facingLeft = false // Initialize facing direction (start facing right)
    }

    addSnowballs() {
        // create snowball at random position in the sky
        let snowball = this.snowballsGroup.create(Phaser.Math.Between(50, game.config.width - 50), Phaser.Math.Between(50, 500), "snow")
        snowball.setScale(0.02) // Make snowballs smaller (30% of original size)
        snowball.body.setVelocity(0, 0) // Start stationary
        snowball.body.setGravityY(0) // No gravity initially
        
        // After 5 seconds, make the snowball fall
        this.time.delayedCall(3000, () => {
            if (snowball && snowball.active) {
                snowball.body.setGravityY(400) // Make it fall
            }
        })
        
        // Remove snowball if it goes off screen
        this.time.delayedCall(15000, () => {
            if (snowball && snowball.active) {
                snowball.destroy()
            }
        })
    }

    collectSnowball(dude, snowball) {
        snowball.disableBody(true, true)
        this.snowballCount += 1; // Increase snowball count
        this.playerScoreText.setText(this.snowballCount); // Update player head text
    }

    createTargets() {
        // Create initial targets up to max limit
        for (let i = 0; i < this.maxTargets; i++) {
            this.spawnNewTarget()
        }
    }

    spawnNewTarget() {
        // Only spawn if under the limit
        if (this.targetsGroup.children.size < this.maxTargets) {
            let x = Phaser.Math.Between(100, game.config.width - 100)
            let y = Phaser.Math.Between(200, 650) // Don't spawn too close to ground or top
            
            let target = this.targetsGroup.create(x, y, 'target').setScale(0.1)
        }
    }

    shootSnowball() {
        if (this.snowballCount > 0) { // Check snowball count instead of score
            // Create snowball at player position
            let projectile = this.thrownSnowballs.create(this.dude.x, this.dude.y - 20, 'snow')
            projectile.setScale(0.02)
            
            // Determine direction based on player facing direction
            let velocityX = this.facingLeft ? -400 : 400 // 400 pixels per second
            projectile.body.setVelocity(velocityX, -200) // Slight upward arc
            projectile.body.setGravityY(300) // Make it arc down
            
            // Remove snowball from player's count
            this.snowballCount -= 1
            this.playerScoreText.setText(this.snowballCount)
             
            // Remove projectile after 3 seconds
            this.time.delayedCall(3000, () => {
                if (projectile && projectile.active) {
                    projectile.destroy()
                }
            })
        }
    }

    hitTarget(snowball, target) {
        // Remove the snowball
        snowball.destroy()
        
        // Add 10 points to score for hitting target
        this.score += 10
        this.scoreText.setText(this.score + ' XP')
        
        // Remove the hit target
        target.destroy()
        
        // No need for delayed respawn - the timer will handle new targets
    }

    update() {
        if (this.wasd.A.isDown) {
            this.dude.body.velocity.x = -gameOptions.dudeSpeed;
            this.dude.anims.play('left', true) // Use left animation (frames 0-3)
            this.dude.flipX = false // Don't flip since frames are already left-facing
            this.facingLeft = true // Track facing direction
        }
        else if (this.wasd.D.isDown) {
            this.dude.body.velocity.x = gameOptions.dudeSpeed;
            this.dude.anims.play('right', true) // Use right animation (frames 5-9)
            this.dude.flipX = false // Don't flip since frames are already right-facing
            this.facingLeft = false // Track facing direction
        }
        else {
            this.dude.body.velocity.x = 0;
            this.dude.anims.play('turn', true)
            // Keep the current facing direction when turning
        }

        if (this.wasd.W.isDown && this.dude.body.touching.down) {
            this.dude.body.velocity.y = -gameOptions.dudeGravity / 2;
        }

        // Shoot snowball when space is pressed
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.shootSnowball()
        }

        // Update player score text position to follow the player
        this.playerScoreText.x = this.dude.x;
        this.playerScoreText.y = this.dude.y - 60;
    }
}