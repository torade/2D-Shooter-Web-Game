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
    }

    preload() {
        this.load.spritesheet('dude', 'assets/dude.png', {frameWidth: 32, frameHeight: 48})
        this.load.image('ground', 'assets/platform.png')
        this.load.image('star', 'assets/star.png')
    }

    create() {
        this.ground = this.physics.add.group({
            immovable: true,
            allowGravity: false
        })

        let groundSprite1 = this.ground.create(500, 750, 'ground').setScale(10, 4);

        this.dude = this.physics.add.sprite(game.config.width / 2, game.config.height / 2, "dude")
        this.dude.body.gravity.y = gameOptions.dudeGravity
        this.physics.add.collider(this.dude, this.ground)

        this.starsGroup = this.physics.add.group({})
        this.physics.add.overlap(this.dude, this.starsGroup, this.collectStar, null, this)

        this.add.image(16,16,'star')
        this.scoreText = this.add.text(32,3,'0', {fontSize: '30px', fill: '#000'})

        this.cursors = this.input.keyboard.createCursorKeys()

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

        // timer to spawn stars every 1.6 seconds
        this.starTimer = this.time.addEvent({
            callback: this.addStars,
            callbackScope: this,
            delay: 600,
            loop: true
        })
    }

    addStars() {
        // create star at random position in the sky
        let star = this.starsGroup.create(Phaser.Math.Between(50, game.config.width - 50), Phaser.Math.Between(50, 500), "star")
        star.body.setVelocity(0, 0) // Start stationary
        star.body.setGravityY(0) // No gravity initially
        
        // After 5 seconds, make the star fall
        this.time.delayedCall(3000, () => {
            if (star && star.active) {
                star.body.setGravityY(400) // Make it fall
            }
        })
        
        // Remove star if it goes off screen
        this.time.delayedCall(15000, () => {
            if (star && star.active) {
                star.destroy()
            }
        })
    }

    collectStar(dude, star) {
        star.disableBody(true, true)
        this.score += 1;
        this.scoreText.setText(this.score);
    }

    update() {
        if (this.cursors.left.isDown) {
            this.dude.body.velocity.x = -gameOptions.dudeSpeed;
            this.dude.anims.play('left', true)
        }
        else if (this.cursors.right.isDown) {
            this.dude.body.velocity.x = gameOptions.dudeSpeed;
            this.dude.anims.play('right', true)
        }
        else {
            this.dude.body.velocity.x = 0;
            this.dude.anims.play('turn', true)
        }

        if (this.cursors.up.isDown && this.dude.body.touching.down) {
            this.dude.body.velocity.y = -gameOptions.dudeGravity / 2;
        }
    }
}