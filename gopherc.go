package main

import (
	"fmt"
	"log"
	"math/rand"
	"os"
	"strconv"
	"time"
)

type Method string

const (
	MethodJump      = "jump"
	MethodMessage   = "message"
	MethodClose     = "close"
	MethodAccessory = "accessory"
)

type Message struct {
	Method    Method `json:"method"`
	Message   string `json:"message,omitempty"`
	Accessory int    `json:"accessory"`
}

type Gopher interface {
	GetGophers() ([]string, error)
	SendToGopher(gopher string, msg *Message) error
}

func main() {
	gopher := NewGopher()

	rand.Seed(time.Now().Unix())

	for i := 1; i < len(os.Args); i++ {
		curFlag := os.Args[i]
		switch curFlag {
		case "-h":
			fallthrough
		case "--help":
			fmt.Println("Usage: gopherc --help              OR")
			fmt.Println("       gopherc -a [accessory type] OR")
			fmt.Println("       gopherc -j                  OR")
			fmt.Println("       gopherc -m <message>        OR")
			fmt.Println("       gopherc -x")
			fmt.Println("")
			fmt.Println("-a [accessory type]  Show accessory. If type is omitted or 0, accessory will be hidden.")
			fmt.Println("-j                   Jump.")
			fmt.Println("-m <message>         Say specified text.")
			fmt.Println("-x                   Close all Gopher instance")
			fmt.Println("-h, --help           Show this message and exit.")
			os.Exit(0)

		case "-a":
			accessoryType := 0
			if i+1 < len(os.Args) {
				ty, err := strconv.Atoi(os.Args[i+1])
				if err != nil {
					fmt.Println("Accessory type must be number.")
					os.Exit(1)
				}
				accessoryType = ty
			}
			gophers, err := gopher.GetGophers()
			if err != nil {
				log.Fatal(err)
			}
			rand.Shuffle(len(gophers), func(i, j int) {
				gophers[i], gophers[j] = gophers[j], gophers[i]
			})
			msg := &Message{Method: MethodAccessory, Accessory: accessoryType}
			for _, instance := range gophers {
				if err := gopher.SendToGopher(instance, msg); err != nil {
					fmt.Printf("%s: Cannot send message to Gopher instance: %v\n", instance, err.Error())
					continue
				}
				break
			}

		case "-j":
			gophers, err := gopher.GetGophers()
			if err != nil {
				log.Fatal(err)
			}
			msg := &Message{Method: MethodJump}
			for _, instance := range gophers {
				if err := gopher.SendToGopher(instance, msg); err != nil {
					fmt.Printf("%s: Cannot send message to Gopher instance: %v\n", instance, err.Error())
				}
			}

		case "-m":
			if i+1 >= len(os.Args) {
				fmt.Println("Message required")
				os.Exit(1)
			}

			gophers, err := gopher.GetGophers()
			if err != nil {
				log.Fatal(err)
			}
			rand.Shuffle(len(gophers), func(i, j int) {
				gophers[i], gophers[j] = gophers[j], gophers[i]
			})
			msg := &Message{Method: MethodMessage, Message: os.Args[i+1]}
			for _, instance := range gophers {
				if err := gopher.SendToGopher(instance, msg); err != nil {
					fmt.Printf("%s: Cannot send message to Gopher instance: %v\n", instance, err.Error())
					continue
				}
				break
			}

			i++

		case "-x":
			gophers, err := gopher.GetGophers()
			if err != nil {
				log.Fatal(err)
			}
			msg := &Message{Method: MethodClose}
			for _, instance := range gophers {
				if err := gopher.SendToGopher(instance, msg); err != nil {
					fmt.Printf("%s: Cannot send message to Gopher instance: %v\n", instance, err.Error())
				}
			}
		}
	}
}
