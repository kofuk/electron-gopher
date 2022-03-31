package main

import (
	"fmt"
	"log"
	"math/rand"
	"os"
)

type Method string
const (
	MethodJump = "jump"
	MethodMessage = "message"
	MethodClose = "close"
)

type Message struct {
	Method Method `json:"method"`
	Message string `json:"message,omitempty"`
}

type Gopher interface {
	GetGophers() ([]string, error)
	SendToGopher(gopher string, msg *Message) error
}

func main() {
	gopher := NewGopher()

	for i := 1; i < len(os.Args); i++ {
		curFlag := os.Args[i]
		switch curFlag {
		case "-h":
			fallthrough
		case "--help":
			fmt.Println("Usage: gopherc --help        OR")
			fmt.Println("       gopherc -j            OR")
			fmt.Println("       gopherc -m <message>    OR")
			fmt.Println("       gopherc -x")
			os.Exit(0)

		case "-j":
			gophers, err := gopher.GetGophers()
			if err != nil {
				log.Fatal(err)
			}
			msg := &Message{Method:MethodJump}
			for _, instance := range gophers {
				if err := gopher.SendToGopher(instance, msg); err != nil {
					fmt.Printf("%s: Cannot send message to Gopher instance: %v\n", instance, err.Error())
				}
			}

		case "-m":
			if i + 1 >= len(os.Args) {
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
