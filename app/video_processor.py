import os
import tempfile
import subprocess
from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.video import VideoSubmission, WeeklyCompilation, MusicTrack
from app.models.group import Group
from app.aws_config import aws_config

class VideoProcessor:
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp()
    
    def process_weekly_compilation(self, group_id: int, db: Session):
        """Process weekly compilation for a group"""
        # Get all video submissions for the group from the current week
        week_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = week_start + timedelta(days=7)
        
        submissions = db.query(VideoSubmission).filter(
            VideoSubmission.group_id == group_id,
            VideoSubmission.submitted_at >= week_start,
            VideoSubmission.submitted_at < week_end
        ).all()
        
        if not submissions:
            return None
        
        # Download videos from S3
        video_files = []
        for submission in submissions:
            video_path = self._download_video(submission.s3_key)
            if video_path:
                video_files.append(video_path)
        
        if not video_files:
            return None
        
        # Create compilation
        compilation_path = self._create_compilation(video_files, group_id)
        if not compilation_path:
            return None
        
        # Upload to S3
        s3_key = f"compilations/{group_id}/{datetime.utcnow().strftime('%Y%m%d')}.mp4"
        success = aws_config.upload_file(
            open(compilation_path, 'rb'),
            s3_key,
            'video/mp4'
        )
        
        if success:
            # Save to database
            compilation = WeeklyCompilation(
                group_id=group_id,
                week_start=week_start,
                week_end=week_end,
                s3_key=s3_key
            )
            db.add(compilation)
            db.commit()
            
            # Clean up temp files
            self._cleanup_temp_files(video_files + [compilation_path])
            
            return compilation
        
        return None
    
    def _download_video(self, s3_key: str) -> str:
        """Download video from S3 to temporary file"""
        try:
            temp_path = os.path.join(self.temp_dir, f"{s3_key.split('/')[-1]}")
            aws_config.s3_client.download_file(
                aws_config.bucket_name,
                s3_key,
                temp_path
            )
            return temp_path
        except Exception as e:
            print(f"Error downloading video {s3_key}: {e}")
            return None
    
    def _create_compilation(self, video_files: List[str], group_id: int) -> str:
        """Create video compilation using FFmpeg"""
        try:
            # Create input list for FFmpeg
            input_list_path = os.path.join(self.temp_dir, "input_list.txt")
            with open(input_list_path, 'w') as f:
                for video_file in video_files:
                    f.write(f"file '{video_file}'\n")
            
            # Output path
            output_path = os.path.join(self.temp_dir, f"compilation_{group_id}.mp4")
            
            # FFmpeg command to concatenate videos
            cmd = [
                'ffmpeg',
                '-f', 'concat',
                '-safe', '0',
                '-i', input_list_path,
                '-c', 'copy',
                '-y',  # Overwrite output file
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                return output_path
            else:
                print(f"FFmpeg error: {result.stderr}")
                return None
                
        except Exception as e:
            print(f"Error creating compilation: {e}")
            return None
    
    def _cleanup_temp_files(self, file_paths: List[str]):
        """Clean up temporary files"""
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Error cleaning up file {file_path}: {e}")
    
    def add_background_music(self, video_path: str, music_track_id: int, db: Session) -> str:
        """Add background music to video"""
        try:
            # Get music track
            music_track = db.query(MusicTrack).filter(MusicTrack.id == music_track_id).first()
            if not music_track:
                return None
            
            # Download music file
            music_path = self._download_video(music_track.s3_key)
            if not music_path:
                return None
            
            # Create output path
            output_path = os.path.join(self.temp_dir, f"with_music_{os.path.basename(video_path)}")
            
            # FFmpeg command to add background music
            cmd = [
                'ffmpeg',
                '-i', video_path,
                '-i', music_path,
                '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2',
                '-c:v', 'copy',
                '-y',
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                return output_path
            else:
                print(f"FFmpeg error adding music: {result.stderr}")
                return None
                
        except Exception as e:
            print(f"Error adding background music: {e}")
            return None

# Global video processor instance
video_processor = VideoProcessor()
