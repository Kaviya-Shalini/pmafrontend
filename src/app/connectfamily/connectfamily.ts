import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { timer, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

interface FamilyMember {
  id: string;
  username: string;
  unread?: number;
}
interface ChatMessage {
  fromUser: string;
  message: string;
  createdAt: Date;
}
interface User {
  userId: string;
  username: string;
  isAlzheimer: boolean;
}

@Component({
  selector: 'app-connect-family',
  templateUrl: './connectfamily.html',
  styleUrls: ['./connectfamily.css'],
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
})
export class ConnectFamilyComponent implements OnInit, OnDestroy {
  pollingSub?: Subscription;

  // UI state
  showChatPanel = false;
  memories: any[] = [];
  user: User | null = null;
  form: FormGroup;
  familyMembers: FamilyMember[] = [];
  chats: { [key: string]: ChatMessage[] } = {};
  selectedMember: FamilyMember | null = null;
  newMessage = '';

  // confirmations
  showDeleteConfirmDialog = false;
  memoryToDeleteId = '';
  showDisconnectConfirmDialog = false;
  memberToDisconnect: FamilyMember | null = null;

  // pagination
  page = 0;
  size = 3;
  totalPages = 1;

  constructor(private fb: FormBuilder, private http: HttpClient, private toastr: ToastrService) {
    this.form = this.fb.group({ username: [''] });
  }

  ngOnInit(): void {
    this.fetchCurrentUser();
    if (!this.pollingSub) this.startPollingMessages();
  }

  ngOnDestroy(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
  }

  // computed name for header
  get memoryOwnerName(): string {
    if (this.user?.isAlzheimer) return this.user.username || 'You';
    return this.selectedMember?.username || this.familyMembers[0]?.username || 'Patient';
  }

  // --- user & family loading ---
  fetchCurrentUser() {
    const userId = localStorage.getItem('pma-userId');
    if (!userId) {
      this.user = null;
      return;
    }

    this.http.get<User>(`http://localhost:8080/api/user/${userId}`).subscribe({
      next: (res) => {
        this.user = { ...res, userId: res.userId || userId };
        // fetch family members after we have user (this will also load memories appropriately)
        this.fetchFamilyMembers();
      },
      error: (err) => {
        console.error('fetchCurrentUser error', err);
        this.user = null;
      },
    });
  }

  fetchFamilyMembers() {
    if (!this.user) return;
    this.http
      .get<FamilyMember[]>(`http://localhost:8080/api/family/list/${this.user.userId}`)
      .subscribe({
        next: (res) => {
          this.familyMembers = res.map((m) => ({ ...m, unread: 0 }));
          this.familyMembers.forEach((m) => {
            if (!this.chats[m.username]) this.chats[m.username] = [];
          });

          // DEFAULT SELECTION / LOAD MEMORIES:
          // - If user is patient (isAlzheimer) load patient's memories.
          // - If user is family (not isAlzheimer) pick the first patient (if any) and load their memories.
          if (this.user?.isAlzheimer) {
            this.loadMemories(this.user.userId);
          } else {
            // default select first connected patient (if exists) when familyMembers arrive
            if (!this.selectedMember && this.familyMembers.length > 0) {
              this.selectedMember = this.familyMembers[0];
              this.loadMemories(this.selectedMember.id);
            } else if (this.selectedMember) {
              // ensure memories for currently selected member are loaded (helpful after reconnect)
              this.loadMemories(this.selectedMember.id);
            }
          }
        },
        error: (err) => {
          console.error('fetchFamilyMembers error', err);
        },
      });
  }

  // --- connect ---
  connectFamilyMember() {
    const username = this.form.value.username?.trim();
    if (!username) {
      this.toastr.warning('Please enter a username.');
      return;
    }
    if (!this.user?.isAlzheimer || !this.user.userId) {
      this.toastr.warning('Only patients can add family members.');
      return;
    }
    const payload = { patientId: this.user.userId, familyMemberUsername: username };
    this.http.post('http://localhost:8080/api/family/connect', payload).subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.toastr.success(res.message || 'Family member connected!');
          this.form.reset();
          this.fetchFamilyMembers();
        } else {
          this.toastr.error(res?.message || 'Could not connect family member.');
        }
      },
      error: (err) => {
        console.error('connectFamilyMember error', err);
        this.toastr.error('Failed to connect family member');
      },
    });
  }

  // --- disconnect flow ---
  startDisconnect(member: FamilyMember) {
    this.memberToDisconnect = member;
    this.showDisconnectConfirmDialog = true;
  }

  cancelDisconnect() {
    this.showDisconnectConfirmDialog = false;
    this.memberToDisconnect = null;
  }

  confirmDisconnect() {
    if (!this.user?.userId || !this.memberToDisconnect) return;
    const payload = { patientId: this.user.userId, familyMemberId: this.memberToDisconnect.id };
    this.http.post('http://localhost:8080/api/family/disconnect', payload).subscribe({
      next: () => {
        this.toastr.info(`${this.memberToDisconnect?.username} disconnected.`);
        this.fetchFamilyMembers();
        if (this.selectedMember?.id === this.memberToDisconnect?.id) {
          this.selectedMember = null; // fetchFamilyMembers will re-evaluate selection
        }
        this.cancelDisconnect();
      },
      error: () => {
        this.toastr.error('Failed to disconnect family member');
        this.cancelDisconnect();
      },
    });
  }

  // --- chat methods ---
  toggleChatPanel() {
    // keep selectedMember intact so memories are not hidden when closing chat
    this.showChatPanel = !this.showChatPanel;
  }

  openChat(member: FamilyMember) {
    this.selectedMember = member;
    member.unread = 0;
    this.showChatPanel = true;
    if (!this.user) return;
    const headers = { 'X-Username': this.user.username };
    this.http
      .get<ChatMessage[]>(`http://localhost:8080/api/chat/conversation?other=${member.username}`, {
        headers,
      })
      .subscribe({
        next: (res) => {
          this.chats[member.username] = res || [];
        },
        error: (err) => {
          console.error('openChat error', err);
        },
      });
  }

  selectMemberAndOpenChat(member: FamilyMember) {
    this.selectedMember = member;
    // load memories for selected member if viewer is family (not patient)
    if (this.user && !this.user.isAlzheimer) {
      this.loadMemories(member.id);
    }
    this.openChat(member);
  }

  sendMessage() {
    if (!this.selectedMember || !this.newMessage.trim() || !this.user) return;
    const to = this.selectedMember.username;
    this.http
      .post('http://localhost:8080/api/chat/send', { to, message: this.newMessage.trim() })
      .subscribe({
        next: (res: any) => {
          if (!this.chats[to]) this.chats[to] = [];
          // assume backend returns created message in res.data
          this.chats[to].push(
            res?.data || {
              fromUser: this.user!.username,
              message: this.newMessage.trim(),
              createdAt: new Date(),
            }
          );
          this.newMessage = '';
        },
        error: (err) => {
          console.error('sendMessage error', err);
        },
      });
  }

  startPollingMessages() {
    this.pollingSub = timer(0, 5000).subscribe(() => {
      if (!this.user) return;
      const headers = { 'X-Username': this.user.username };
      this.http
        .get<ChatMessage[]>(`http://localhost:8080/api/chat/receive`, { headers })
        .subscribe({
          next: (res) => {
            (res || []).forEach((msg) => {
              const sender = msg.fromUser;
              const exists = this.chats[sender]?.some(
                (m) => new Date(m.createdAt).getTime() === new Date(msg.createdAt).getTime()
              );
              if (exists) return;
              if (!this.chats[sender]) this.chats[sender] = [];
              this.chats[sender].push(msg);
              const member = this.familyMembers.find((m) => m.username === sender);
              if (member && (!this.selectedMember || this.selectedMember.username !== sender)) {
                member.unread = (member.unread || 0) + 1;
                this.toastr.info(`New message from ${member.username}`);
              }
            });
          },
          error: (err) => {
            console.error('polling error', err);
          },
        });
    });
  }

  isMyMessage(chat: ChatMessage): boolean {
    return chat.fromUser === this.user?.username;
  }

  // --- memories ---
  loadMemories(userId: string) {
    if (!userId) {
      this.memories = [];
      return;
    }
    this.http
      .get<any>(
        `http://localhost:8080/api/memories/user/${userId}?page=${this.page}&size=${this.size}`
      )
      .subscribe({
        next: (res: any) => {
          this.memories = res?.content || [];
          this.totalPages = res?.totalPages || 1;
        },
        error: (err) => {
          console.error('loadMemories error', err);
          this.memories = [];
        },
      });
  }

  downloadFile(memoryId: string): void {
    this.http
      .get(`http://localhost:8080/api/memories/${memoryId}/download?type=file`, {
        responseType: 'blob',
      })
      .subscribe(
        (blob) => {
          const a = document.createElement('a');
          const objectUrl = URL.createObjectURL(blob);
          a.href = objectUrl;
          a.download = 'memory-file';
          a.click();
          URL.revokeObjectURL(objectUrl);
        },
        (err) => console.error(err)
      );
  }

  downloadVoice(memoryId: string): void {
    this.http
      .get(`http://localhost:8080/api/memories/${memoryId}/download?type=voice`, {
        responseType: 'blob',
      })
      .subscribe(
        (blob) => {
          const url = window.URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.play();
        },
        (err) => console.error(err)
      );
  }

  startDelete(memoryId: string) {
    this.memoryToDeleteId = memoryId;
    this.showDeleteConfirmDialog = true;
  }

  cancelDelete() {
    this.showDeleteConfirmDialog = false;
    this.memoryToDeleteId = '';
  }

  confirmDelete() {
    if (!this.memoryToDeleteId) return;
    this.http
      .delete<{ success: boolean; message: string }>(
        `http://localhost:8080/api/memories/${this.memoryToDeleteId}`
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.memories = this.memories.filter((m) => m.id !== this.memoryToDeleteId);
            this.toastr.success(res.message, 'Deleted');
          } else {
            this.toastr.error(res.message || 'Error deleting memory', 'Error');
          }
          this.cancelDelete();
        },
        error: () => {
          this.toastr.error('Failed to delete memory', 'Error');
          this.cancelDelete();
        },
      });
  }

  // pagination
  nextPage() {
    if (this.page + 1 < this.totalPages) {
      this.page++;
      const userId = this.user?.isAlzheimer ? this.user!.userId : this.selectedMember?.id;
      if (userId) this.loadMemories(userId);
    }
  }

  prevPage() {
    if (this.page > 0) {
      this.page--;
      const userId = this.user?.isAlzheimer ? this.user!.userId : this.selectedMember?.id;
      if (userId) this.loadMemories(userId);
    }
  }
}
