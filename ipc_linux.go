package main

import (
	"encoding/json"
	"errors"
	"net"
	"os"
	"path/filepath"
)

type UnixGopher struct {}

func (UnixGopher) GetGophers() ([]string, error) {
	dirents, err := os.ReadDir("/tmp")
	if err != nil {
		return nil, err
	}

	var result []string

	for _, ent := range dirents {
		name := ent.Name()
		if len(name) > 7 && name[:7] == "gopher." {
			result = append(result, filepath.Join("/tmp", name));
		}
	}

	return result, nil
}

func (UnixGopher) SendToGopher(gopher string, msg *Message) error {
	stat, err := os.Stat(gopher)
	if err != nil {
		return err
	}
	if stat.Mode().Type() != os.ModeSocket {
		return errors.New("Not a socket")
	}

	conn, err := net.Dial("unix", gopher)
	if err != nil {
		os.Remove(gopher)
		return err
	}
	defer conn.Close()

	if err := json.NewEncoder(conn).Encode(msg); err != nil {
		return err
	}

	return nil
}

func NewGopher() Gopher {
	return UnixGopher{}
}
