import { useRef, useState, useCallback } from "react";
import "./App.css";
import styled from "@emotion/styled";
import { JuliaSetCanvas } from "./JuliaSetCanvas";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import { AppBar, DrawerHeader, drawerWidth, Main } from "./layout";
import Drawer from "@mui/material/Drawer";

import { useTheme } from "@mui/material/styles";
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import MenuIcon from "@mui/icons-material/Menu";

type Vec = {
  x: number;
  y: number;
};

const CDisplay = styled.div`
  position: fixed;
  bottom: 10px;
  left: 10px;
  display: flex;
  gap: 5px;
  background: white;
  color: black;
  padding: 4px;
`;

const origSize: Vec = { x: 3, y: 3 };
const size: Vec = { x: origSize.x, y: origSize.y };
const originPosition: Vec = { x: 0, y: 0 };
const pos: Vec = { x: originPosition.x, y: originPosition.y };

function constrain(n: number, low: number, high: number): number {
  return Math.max(Math.min(n, high), low);
}

/**
 * Scales a number from one range to another.
 *
 * Replacement for p5.js map
 */
function scale(
  value: number,
  fromRangeStart: number,
  fromRangeEnd: number,
  toRangeStart: number,
  toRangeEnd: number,
  withinBounds?: boolean,
): number {
  const newval =
    ((value - fromRangeStart) / (fromRangeEnd - fromRangeStart)) *
      (toRangeEnd - toRangeStart) +
    toRangeStart;

  if (!withinBounds) {
    return newval;
  }
  if (toRangeStart < toRangeEnd) {
    return constrain(newval, toRangeStart, toRangeEnd);
  } else {
    return constrain(newval, toRangeEnd, toRangeStart);
  }
}

// Helper function to map mouse coordinates to complex plane coordinates
function getComplexCoordinateFromMouse(
  mouseX: number,
  mouseY: number,
  canvasWidth: number,
  canvasHeight: number,
  viewPosX: number,
  viewPosY: number,
  viewSizeX: number,
  viewSizeY: number,
): Vec {
  // Map mouse pixel coordinates to complex plane coordinates
  // The mouse position is converted using the same scale function as the shader
  return {
    x: viewPosX + scale(mouseX, 0, canvasWidth, -viewSizeX / 2, viewSizeX / 2),
    y: viewPosY + scale(mouseY, canvasHeight, 0, -viewSizeY / 2, viewSizeY / 2),
  };
}

function App() {
  // State for tracking mouse position mapped to complex plane
  const [mouseC, setMouseC] = useState<Vec>({ x: -0.742, y: 0.163 });

  // Refs for 60 FPS throttling
  const lastRenderTimeRef = useRef<number>(0);
  const frameInterval = 1000 / 60; // ~16.67ms for 60 FPS

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!event?.target) {
        return;
      }
      // @ts-expect-error: TODO: improve types for event
      const canvasElement: HTMLCanvasElement = event.target;
      const now = Date.now();

      // Only process if enough time has passed (60 FPS = ~16.67ms between frames)
      if (now - lastRenderTimeRef.current < frameInterval) {
        return;
      }
      lastRenderTimeRef.current = now;

      // Get the canvas bounding rectangle
      // This tells us where the canvas is positioned on screen
      const rect = canvasElement.getBoundingClientRect();

      // Calculate mouse position relative to canvas
      // (0, 0) is at the top-left of the canvas
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Map mouse coordinates to complex plane coordinates
      // The origin (0, 0) of the complex plane is in the center of the screen
      const newC = getComplexCoordinateFromMouse(
        mouseX,
        mouseY,
        rect.width,
        rect.height,
        pos.x,
        pos.y,
        size.x,
        size.y,
      );

      // newC.x = newC.x / 4;
      // newC.y = newC.y / 4;
      // Update the Julia constant c
      setMouseC(newC);
    },
    [setMouseC, frameInterval],
  );

  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  return (
    <Box sx={{ display: "flex", width: "100%", height: "100%" }}>
      <CssBaseline />
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={[
              {
                mr: 2,
              },
              open && { display: "none" },
            ]}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Julia Set
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
        variant="persistent"
        anchor="left"
        open={open}
      >
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
            <ChevronLeftIcon />
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List></List>
        <Divider />
        <List></List>
      </Drawer>
      <Main open={open}>
        <DrawerHeader />
        <JuliaSetCanvas mouseC={mouseC} onMouseMove={handleMouseMove} />
        <CDisplay>
          C is ({mouseC.x}, {mouseC.y})
        </CDisplay>
      </Main>
    </Box>
  );
}

export default App;
