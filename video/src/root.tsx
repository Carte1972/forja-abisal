import { Composition, Folder } from 'remotion';
import { loadFonts } from './fonts';
import { Presentation, ScenePreview } from './presentation';
import { FPS, HEIGHT, WIDTH } from './theme';
import {
  calculatePresentationMetadata,
  SCENES,
  sceneTimings,
  type PresentationProps,
} from './timing';

loadFonts();

const defaultProps: PresentationProps = { scenes: [], music: false };

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="presentacion"
        component={Presentation}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={FPS}
        defaultProps={defaultProps}
        calculateMetadata={calculatePresentationMetadata}
      />
      <Folder name="escenas">
        {SCENES.map((scene, index) => (
          <Composition
            key={scene.id}
            id={`escena-${index + 1}-${scene.id.replace(/_/g, '-')}`}
            component={ScenePreview}
            width={WIDTH}
            height={HEIGHT}
            fps={FPS}
            durationInFrames={FPS}
            defaultProps={{ ...defaultProps, index }}
            calculateMetadata={async ({ props }) => {
              const scenes = await sceneTimings();
              return {
                durationInFrames: scenes[index]!.durationInFrames,
                props: { ...props, scenes },
              };
            }}
          />
        ))}
      </Folder>
    </>
  );
}
