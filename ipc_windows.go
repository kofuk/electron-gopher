package main

import (
	"encoding/json"

	"github.com/Microsoft/go-winio"
)

type WindowsGopher struct {}

func (WindowsGopher) GetGophers() ([]string, error) {
	return findNamedPipes("gopher.")
}

func (WindowsGopher) SendToGopher(gopher string, msg *Message) error {
	conn, err := winio.DialPipe(gopher, nil)
	if err != nil {
		return err
	}
	defer conn.Close()

	if err := json.NewEncoder(conn).Encode(msg); err != nil {
		return err
	}

	return nil
}

func NewGopher() Gopher {
	return WindowsGopher{}
}
